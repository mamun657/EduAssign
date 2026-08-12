using EduAssignPro.Application.Abstractions;
using EduAssignPro.Application.Configuration;
using EduAssignPro.Application.Dtos.Similarity;
using EduAssignPro.Application.Exceptions;
using EduAssignPro.Domain.Common;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Domain.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EduAssignPro.Application.Services;

/// <summary>
/// Phase 6: Core service that runs the similarity analysis pipeline.
/// </summary>
public class SimilarityAnalysisService
{
    private readonly ISimilarityAnalysisRepository _analysisRepo;
    private readonly IAssignmentRepository _assignments;
    private readonly IUserRepository _users;
    private readonly IFileRepository _files;
    private readonly ITextExtractor _extractor;
    private readonly IMlClient _ml;
    private readonly TfidfLexicalSimilarityService _lexical;
    private readonly SimilarityOptions _options;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<SimilarityAnalysisService> _logger;

    public SimilarityAnalysisService(
        ISimilarityAnalysisRepository analysisRepo,
        IAssignmentRepository assignments,
        IUserRepository users,
        IFileRepository files,
        ITextExtractor extractor,
        IMlClient ml,
        TfidfLexicalSimilarityService lexical,
        IOptions<SimilarityOptions> options,
        ICurrentUser currentUser,
        ILogger<SimilarityAnalysisService> logger)
    {
        _analysisRepo = analysisRepo;
        _assignments = assignments;
        _users = users;
        _files = files;
        _extractor = extractor;
        _ml = ml;
        _lexical = lexical;
        _options = options.Value;
        _currentUser = currentUser;
        _logger = logger;
    }

    // ---- Public API ----

    /// <summary>Queue an analysis for a single submission. Returns the (possibly existing) analysis doc.</summary>
    public async Task<SimilarityAnalysis> StartAnalysisAsync(string assignmentId, string submissionId, string studentId, CancellationToken ct = default)
    {
        var existing = await _analysisRepo.GetBySubmissionIdAsync(submissionId, ct);
        var analysis = existing ?? new SimilarityAnalysis
        {
            AssignmentId = assignmentId,
            SubmissionId = submissionId,
            StudentId = studentId,
            Status = SimilarityAnalysisStatus.NotAnalyzed
        };
        analysis.Status = SimilarityAnalysisStatus.Analyzing;
        analysis.UpdatedAt = DateTime.UtcNow;
        analysis.ErrorMessage = null;
        await _analysisRepo.UpsertAsync(analysis, ct);
        return analysis;
    }

    /// <summary>
    /// Run the full pipeline for a submission. Safe to call repeatedly; always persists state
    /// (Completed with scores, or Failed with error message).
    /// </summary>
    public async Task<SimilarityAnalysis> RunAnalysisAsync(string submissionId, CancellationToken ct = default)
    {
        var analysis = await _analysisRepo.GetBySubmissionIdAsync(submissionId, ct)
            ?? throw new NotFoundException("Similarity analysis record not found for submission.");
        var assignment = await _assignments.GetByIdAsync(analysis.AssignmentId, ct)
            ?? throw new NotFoundException("Assignment not found.");

        analysis.Status = SimilarityAnalysisStatus.Analyzing;
        analysis.ErrorMessage = null;
        analysis.UpdatedAt = DateTime.UtcNow;
        await _analysisRepo.UpsertAsync(analysis, ct);

        try
        {
            // 1. Extract text from this submission (text field OR attachment file).
            var ownText = await ExtractSubmissionTextAsync(assignment, ct);
            if (string.IsNullOrWhiteSpace(ownText))
            {
                analysis.Status = SimilarityAnalysisStatus.Failed;
                analysis.ErrorMessage = "No text could be extracted from the submission. Similarity cannot be computed.";
                analysis.AnalyzedAt = DateTime.UtcNow;
                analysis.UpdatedAt = DateTime.UtcNow;
                await _analysisRepo.UpsertAsync(analysis, ct);
                return analysis;
            }

            // 2. Find other submissions in the same assignment (different student).
            var peers = await LoadPeerSubmissionsAsync(analysis.AssignmentId, analysis.StudentId, ct);
            var matches = new List<SimilarityMatch>();
            int comparedCount = 0;

            // 3. Always compute own embedding (for self-similarity tests / future hybrid caching).
            var ownEmbedding = _options.DisableSemantic
                ? null
                : await _ml.EmbedAsync(TruncateForEmbedding(ownText), ct);

            foreach (var peer in peers)
            {
                ct.ThrowIfCancellationRequested();
                var peerText = await ExtractSubmissionTextAsync(peer, ct);
                if (string.IsNullOrWhiteSpace(peerText)) continue;

                comparedCount++;

                var lex = _lexical.CosineSimilarity(ownText, peerText) * 100d;
                double sem = 0d;
                if (!_options.DisableSemantic && ownEmbedding is not null)
                {
                    var peerEmbedding = await _ml.EmbedAsync(TruncateForEmbedding(peerText), ct);
                    if (peerEmbedding is not null)
                        sem = Cosine(ownEmbedding, peerEmbedding) * 100d;
                }

                var final = _options.LexicalWeight * lex + _options.SemanticWeight * sem;
                var peerStudent = await _users.GetByIdAsync(peer.StudentId, ct);
                matches.Add(new SimilarityMatch
                {
                    SubmissionId = peer.Id,
                    StudentId = peer.StudentId,
                    StudentName = peerStudent is null ? "Unknown" : $"{peerStudent.FirstName} {peerStudent.LastName}",
                    LexicalScore = Math.Round(lex, 2),
                    SemanticScore = Math.Round(sem, 2),
                    FinalScore = Math.Round(final, 2)
                });
            }

            // 4. Rank matches and keep top-N above cutoff.
            var ranked = matches
                .Where(m => m.FinalScore >= _options.MinCompareScore)
                .OrderByDescending(m => m.FinalScore)
                .Take(Math.Max(1, _options.TopMatches))
                .ToList();

            analysis.Matches = ranked;
            analysis.ComparedCount = comparedCount;
            analysis.ExtractedLength = ownText.Length;

            if (ranked.Count == 0)
            {
                analysis.Status = SimilarityAnalysisStatus.Completed;
                analysis.OverallScore = 0d;
                analysis.HighestSimilarityScore = 0d;
                analysis.LexicalScore = 0d;
                analysis.SemanticScore = 0d;
                analysis.ComparedSubmissionId = null;
                analysis.ComparedStudentId = null;
            }
            else
            {
                var top = ranked[0];
                analysis.Status = SimilarityAnalysisStatus.Completed;
                analysis.OverallScore = top.FinalScore;
                analysis.HighestSimilarityScore = top.FinalScore;
                analysis.LexicalScore = top.LexicalScore;
                analysis.SemanticScore = top.SemanticScore;
                analysis.ComparedSubmissionId = top.SubmissionId;
                analysis.ComparedStudentId = top.StudentId;
            }

            analysis.AnalyzedAt = DateTime.UtcNow;
            analysis.UpdatedAt = DateTime.UtcNow;
            await _analysisRepo.UpsertAsync(analysis, ct);
            _logger.LogInformation(
                "Similarity analysis completed for submission {Sub}: overall={Score}, compared {Count} peers",
                analysis.SubmissionId, analysis.OverallScore, comparedCount);
            return analysis;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Similarity analysis failed for submission {Sub}", analysis.SubmissionId);
            analysis.Status = SimilarityAnalysisStatus.Failed;
            analysis.ErrorMessage = ex.Message;
            analysis.AnalyzedAt = DateTime.UtcNow;
            analysis.UpdatedAt = DateTime.UtcNow;
            await _analysisRepo.UpsertAsync(analysis, ct);
            return analysis;
        }
    }

    /// <summary>Student-safe view: a single summary for the student's own submission. Always allowed for the owning student.</summary>
    public async Task<SimilaritySummaryDto?> GetForOwnSubmissionAsync(string submissionId, CancellationToken ct = default)
    {
        var analysis = await _analysisRepo.GetBySubmissionIdAsync(submissionId, ct);
        if (analysis is null) return null;
        return await BuildSummaryDtoAsync(analysis, includeMatches: false, includeComparedStudent: false, ct);
    }

    /// <summary>Teacher/admin view of a per-submission summary.</summary>
    public async Task<SimilaritySummaryDto?> GetForSubmissionAsync(string submissionId, CancellationToken ct = default)
    {
        EnsureTeacherOrAdmin();
        var analysis = await _analysisRepo.GetBySubmissionIdAsync(submissionId, ct);
        if (analysis is null) return null;
        return await BuildSummaryDtoAsync(analysis, includeMatches: true, includeComparedStudent: true, ct);
    }

    /// <summary>Teacher/admin aggregated view of all submissions for one assignment.</summary>
    public async Task<AssignmentSimilaritySummaryDto> GetAssignmentSummaryAsync(string assignmentId, CancellationToken ct = default)
    {
        EnsureTeacherOrAdmin();
        var assignment = await _assignments.GetByIdAsync(assignmentId, ct)
            ?? throw new NotFoundException("Assignment not found.");
        if (_currentUser.Role == Role.Teacher.ToString() && assignment.TeacherId != _currentUser.UserId)
            throw new ForbiddenException("You can only view similarity for your own assignments.");

        var submissions = await GetSubmissionsForAssignmentAsync(assignmentId, ct);

        var analyses = await _analysisRepo.ListByAssignmentAsync(assignmentId, ct);
        var bySub = analyses.ToDictionary(a => a.SubmissionId, a => a);

        var dto = new AssignmentSimilaritySummaryDto
        {
            AssignmentId = assignmentId,
            TotalSubmissions = submissions.Count(a => a.SubmittedAt is not null)
        };

        foreach (var sub in submissions.Where(a => a.SubmittedAt is not null))
        {
            if (bySub.TryGetValue(sub.Id, out var sa))
            {
                dto.Submissions.Add(await BuildSummaryDtoAsync(sa, includeMatches: true, includeComparedStudent: true, ct));
                if (sa.Status == SimilarityAnalysisStatus.Completed) dto.AnalyzedSubmissions++;
                if (sa.HighestSimilarityScore is double hs && hs >= _options.ModerateThreshold) dto.HighSimilarityPairs++;
            }
            else
            {
                var student = await _users.GetByIdAsync(sub.StudentId, ct);
                dto.Submissions.Add(new SimilaritySummaryDto
                {
                    SubmissionId = sub.Id,
                    AssignmentId = sub.Id,
                    StudentId = sub.StudentId,
                    StudentName = student is null ? "Unknown" : $"{student.FirstName} {student.LastName}",
                    Status = "NotAnalyzed",
                    Level = "Unknown"
                });
            }
        }

        dto.Submissions = dto.Submissions
            .OrderByDescending(s => s.HighestSimilarityScore ?? -1d)
            .ThenBy(s => s.StudentName)
            .ToList();

        return dto;
    }

    /// <summary>
    /// Pairwise comparison view between two submissions (teacher/admin only).
    /// Uses cached analysis results; if not analyzed yet, returns NotFoundException
    /// to nudge the user to trigger analysis.
    /// </summary>
    public async Task<SimilarityComparisonDto> CompareAsync(string submissionIdA, string submissionIdB, CancellationToken ct = default)
    {
        EnsureTeacherOrAdmin();
        if (string.IsNullOrWhiteSpace(submissionIdA) || string.IsNullOrWhiteSpace(submissionIdB))
            throw new ValidationException("Both submission ids are required.");
        if (submissionIdA == submissionIdB)
            throw new ValidationException("Cannot compare a submission with itself.");

        var a = await _assignments.GetByIdAsync(submissionIdA, ct)
            ?? throw new NotFoundException("Submission not found.");
        var b = await _assignments.GetByIdAsync(submissionIdB, ct)
            ?? throw new NotFoundException("Other submission not found.");
        if (a.Id != b.Id && a.TeacherId != b.TeacherId)
            throw new ValidationException("Submissions are not from the same assignment.");

        EnsureCanAccessAssignment(a);
        EnsureCanAccessAssignment(b);

        var textA = await ExtractSubmissionTextAsync(a, ct);
        var textB = await ExtractSubmissionTextAsync(b, ct);
        if (string.IsNullOrWhiteSpace(textA) || string.IsNullOrWhiteSpace(textB))
            throw new ValidationException("One of the submissions has no extractable text.");

        var lex = _lexical.CosineSimilarity(textA, textB) * 100d;
        double sem = 0d;
        if (!_options.DisableSemantic)
        {
            var eA = await _ml.EmbedAsync(TruncateForEmbedding(textA), ct);
            var eB = await _ml.EmbedAsync(TruncateForEmbedding(textB), ct);
            if (eA is not null && eB is not null) sem = Cosine(eA, eB) * 100d;
        }
        var final = _options.LexicalWeight * lex + _options.SemanticWeight * sem;
        var studentA = await _users.GetByIdAsync(a.StudentId, ct);
        var studentB = await _users.GetByIdAsync(b.StudentId, ct);

        return new SimilarityComparisonDto
        {
            SubmissionId = a.Id,
            StudentId = a.StudentId,
            StudentName = studentA is null ? "Unknown" : $"{studentA.FirstName} {studentA.LastName}",
            OtherSubmissionId = b.Id,
            OtherStudentId = b.StudentId,
            OtherStudentName = studentB is null ? "Unknown" : $"{studentB.FirstName} {studentB.LastName}",
            LexicalScore = Math.Round(lex, 2),
            SemanticScore = Math.Round(sem, 2),
            FinalScore = Math.Round(final, 2),
            Level = LevelFor(final),
            AssignmentId = a.Id,
            AnalyzedAt = DateTime.UtcNow
        };
    }

    // ---- Helpers ----

    private async Task<List<Assignment>> LoadPeerSubmissionsAsync(string assignmentId, string studentId, CancellationToken ct)
    {
        var list = await GetSubmissionsForAssignmentAsync(assignmentId, ct);
        return list.Where(a => a.StudentId != studentId && a.SubmittedAt is not null).ToList();
    }

    private async Task<List<Assignment>> GetSubmissionsForAssignmentAsync(string assignmentId, CancellationToken ct)
    {
        var all = await _assignments.ListAsync(null, ct);
        // that have submissions. Without a dedicated Submission collection, the safest pattern is:
        // pull from repo filtered by `TeacherId == assignment.TeacherId` and `SubjectId == assignment.SubjectId`
        // and exclude our own id.
        var own = await _assignments.GetByIdAsync(assignmentId, ct);
        if (own is null) return new List<Assignment>();
        var siblings = (await _assignments.ListAsync(null, ct))
            .Where(a => a.Id != own.Id
                        && a.TeacherId == own.TeacherId
                        && a.SubjectId == own.SubjectId
                        && a.IsPublished
                        && a.SubmittedAt is not null)
            .ToList();
        return siblings;
    }

    /// <summary>Extract text either from a textual SubmissionText field or from an attached PDF/text file.</summary>
    private async Task<string> ExtractSubmissionTextAsync(Assignment assignment, CancellationToken ct)
    {
        var sb = new System.Text.StringBuilder();
        if (!string.IsNullOrWhiteSpace(assignment.SubmissionText))
            sb.AppendLine(assignment.SubmissionText.Trim());

        if (!string.IsNullOrEmpty(assignment.SubmissionFileId))
        {
            var stored = await _files.GetAsync(assignment.SubmissionFileId!, ct);
            if (stored is not null)
            {
                using var ms = new MemoryStream();
                using (var s = stored.OpenReadStream())
                {
                    await s.CopyToAsync(ms, ct);
                }
                var bytes = ms.ToArray();
                var extracted = await _extractor.ExtractAsync(stored.ContentType, stored.FileName, bytes, ct);
                if (!string.IsNullOrWhiteSpace(extracted)) sb.AppendLine(extracted);
            }
        }

        return sb.ToString().Trim();
    }

    private async Task<SimilaritySummaryDto> BuildSummaryDtoAsync(SimilarityAnalysis a, bool includeMatches, bool includeComparedStudent, CancellationToken ct)
    {
        var student = await _users.GetByIdAsync(a.StudentId, ct);
        var dto = new SimilaritySummaryDto
        {
            SubmissionId = a.SubmissionId,
            AssignmentId = a.AssignmentId,
            StudentId = a.StudentId,
            StudentName = student is null ? "Unknown" : $"{student.FirstName} {student.LastName}",
            Status = a.Status.ToString(),
            OverallScore = a.OverallScore,
            HighestSimilarityScore = a.HighestSimilarityScore,
            LexicalScore = a.LexicalScore,
            SemanticScore = a.SemanticScore,
            ComparedSubmissionId = includeComparedStudent ? a.ComparedSubmissionId : null,
            ComparedStudentId = includeComparedStudent ? a.ComparedStudentId : null,
            Level = a.HighestSimilarityScore is double hs ? LevelFor(hs) : "Unknown",
            AnalyzedAt = a.AnalyzedAt,
            ErrorMessage = a.ErrorMessage
        };
        if (includeMatches)
        {
            foreach (var m in a.Matches)
            {
                dto.Matches.Add(new SimilarityMatchDto
                {
                    SubmissionId = m.SubmissionId,
                    StudentId = m.StudentId,
                    StudentName = m.StudentName,
                    LexicalScore = m.LexicalScore,
                    SemanticScore = m.SemanticScore,
                    FinalScore = m.FinalScore
                });
            }
        }
        if (includeComparedStudent && !string.IsNullOrEmpty(dto.ComparedStudentId))
        {
            var cs = await _users.GetByIdAsync(dto.ComparedStudentId!, ct);
            dto.ComparedStudentName = cs is null ? "Unknown" : $"{cs.FirstName} {cs.LastName}";
        }
        return dto;
    }

    private string LevelFor(double score)
    {
        if (score < _options.LowThreshold) return "Low";
        if (score < _options.ModerateThreshold) return "Moderate";
        return "High";
    }

    private void EnsureTeacherOrAdmin()
    {
        var role = _currentUser.Role;
        if (role != Role.Teacher.ToString() && role != Role.Admin.ToString())
            throw new ForbiddenException("Only teachers or admins can view similarity data.");
    }

    private void EnsureCanAccessAssignment(Assignment a)
    {
        var role = _currentUser.Role;
        if (role == Role.Admin.ToString()) return;
        if (role == Role.Teacher.ToString() && a.TeacherId == _currentUser.UserId) return;
        throw new ForbiddenException("You are not authorized to access this assignment.");
    }

    private static double Cosine(float[] a, float[] b)
    {
        if (a.Length != b.Length) return 0d;
        double dot = 0d, na = 0d, nb = 0d;
        for (int i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        if (na == 0d || nb == 0d) return 0d;
        var sim = dot / (Math.Sqrt(na) * Math.Sqrt(nb));
        if (sim < 0d) sim = 0d;
        if (sim > 1d) sim = 1d;
        return sim;
    }

    private static string TruncateForEmbedding(string text)
    {
        // sentence-transformers MiniLM supports ~256 tokens; truncate ~4000 chars.
        const int MaxChars = 4000;
        if (text.Length <= MaxChars) return text;
        return text.Substring(0, MaxChars);
    }
}
