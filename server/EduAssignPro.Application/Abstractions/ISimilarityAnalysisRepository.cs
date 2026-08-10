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
}
