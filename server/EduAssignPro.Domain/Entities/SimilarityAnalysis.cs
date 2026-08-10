using EduAssignPro.Domain.Common;
using EduAssignPro.Domain.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduAssignPro.Domain.Entities;

/// <summary>
/// Phase 6: AI similarity / plagiarism detection analysis result.
///
/// One document per <see cref="Submission"/>. Created when a student submits
/// (or resubmits) and finalized when analysis completes (or fails).
///
/// Per spec:
///   - Id, AssignmentId, SubmissionId
///   - Status (NotAnalyzed / Analyzing / Completed / Failed)
///   - OverallScore, HighestSimilarityScore
///   - ComparedSubmissionId, ComparedStudentId
///   - LexicalScore, SemanticScore
///   - AnalyzedAt, ErrorMessage
///
/// All scores are normalized 0-100.
/// </summary>
[BsonCollection(Constants.SimilarityAnalysesCollection)]
public class SimilarityAnalysis
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    /// <summary>Assignment this submission belongs to (denormalized for fast lookup).</summary>
    [BsonElement("assignmentId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string AssignmentId { get; set; } = string.Empty;

    /// <summary>The submission being analyzed (same as Assignment.Id — kept for clarity & future 1:N submissions).</summary>
    [BsonElement("submissionId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SubmissionId { get; set; } = string.Empty;

    /// <summary>Student who submitted (denormalized so we don't need a join to rank matches).</summary>
    [BsonElement("studentId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string StudentId { get; set; } = string.Empty;

    /// <summary>Status of the analysis lifecycle.</summary>
    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public SimilarityAnalysisStatus Status { get; set; } = SimilarityAnalysisStatus.NotAnalyzed;

    /// <summary>Final normalized score (0-100) for this submission's overall similarity.</summary>
    [BsonElement("overallScore")]
    [BsonIgnoreIfNull]
    public double? OverallScore { get; set; }

    /// <summary>Highest single match found against any other submission for the same assignment (0-100).</summary>
    [BsonElement("highestSimilarityScore")]
    [BsonIgnoreIfNull]
    public double? HighestSimilarityScore { get; set; }

    /// <summary>Lexical TF-IDF cosine score of the worst (highest) match (0-100).</summary>
    [BsonElement("lexicalScore")]
    [BsonIgnoreIfNull]
    public double? LexicalScore { get; set; }

    /// <summary>Semantic embedding cosine score of the worst (highest) match (0-100).</summary>
    [BsonElement("semanticScore")]
    [BsonIgnoreIfNull]
    public double? SemanticScore { get; set; }

    /// <summary>The submission that produced the highest similarity, if any.</summary>
    [BsonElement("comparedSubmissionId")]
    [BsonIgnoreIfNull]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ComparedSubmissionId { get; set; }

    /// <summary>Student who owns the compared submission (so we can show "vs. Student B").</summary>
    [BsonElement("comparedStudentId")]
    [BsonIgnoreIfNull]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ComparedStudentId { get; set; }

    /// <summary>Top-N ranked matches against other students' submissions.</summary>
    [BsonElement("matches")]
    public List<SimilarityMatch> Matches { get; set; } = new();

    /// <summary>Total text length (chars) extracted for analysis. Used for debugging extraction quality.</summary>
    [BsonElement("extractedLength")]
    [BsonIgnoreIfNull]
    public int? ExtractedLength { get; set; }

    /// <summary>How many other submissions were compared against.</summary>
    [BsonElement("comparedCount")]
    [BsonIgnoreIfNull]
    public int? ComparedCount { get; set; }

    [BsonElement("analyzedAt")]
    [BsonIgnoreIfNull]
    public DateTime? AnalyzedAt { get; set; }

    [BsonElement("errorMessage")]
    [BsonIgnoreIfNull]
    public string? ErrorMessage { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Single ranked match against another student's submission.
/// </summary>
public class SimilarityMatch
{
    [BsonElement("submissionId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SubmissionId { get; set; } = string.Empty;

    [BsonElement("studentId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string StudentId { get; set; } = string.Empty;

    /// <summary>Student display name (denormalized for ranking display).</summary>
    [BsonElement("studentName")]
    public string StudentName { get; set; } = string.Empty;

    [BsonElement("lexicalScore")]
    public double LexicalScore { get; set; }

    [BsonElement("semanticScore")]
    public double SemanticScore { get; set; }

    [BsonElement("finalScore")]
    public double FinalScore { get; set; }
}