using EduAssignPro.Domain.Entities;
using MongoDB.Driver;

namespace EduAssignPro.Application.Abstractions;

/// <summary>
/// Phase 6: Similarity analysis persistence.
/// </summary>
public interface ISimilarityAnalysisRepository
{
    Task<SimilarityAnalysis?> GetBySubmissionIdAsync(string submissionId, CancellationToken ct = default);
    Task<List<SimilarityAnalysis>> ListByAssignmentAsync(string assignmentId, CancellationToken ct = default);
    Task UpsertAsync(SimilarityAnalysis analysis, CancellationToken ct = default);
    Task<UpdateResult> UpdateStatusAsync(string id, Domain.Enums.SimilarityAnalysisStatus status, DateTime updatedAt, CancellationToken ct = default);
    /// <summary>Deletes every similarity analysis that references this student (cascade on student delete).</summary>
    Task<long> DeleteByStudentAsync(string studentId, CancellationToken ct = default);
    /// <summary>Deletes every similarity analysis whose assignment belongs to this teacher (cascade on teacher delete).</summary>
    Task<long> DeleteByTeacherAsync(string teacherId, CancellationToken ct = default);
}
