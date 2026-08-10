using EduAssignPro.Application.Abstractions;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Domain.Enums;
using EduAssignPro.Infrastructure.Mongo;
using MongoDB.Driver;

namespace EduAssignPro.Infrastructure.Repositories;

public class SimilarityAnalysisRepository : ISimilarityAnalysisRepository
{
    private readonly MongoContext _ctx;

    public SimilarityAnalysisRepository(MongoContext ctx)
    {
        _ctx = ctx;
    }

    public Task<SimilarityAnalysis?> GetBySubmissionIdAsync(string submissionId, CancellationToken ct = default)
    {
        var filter = Builders<SimilarityAnalysis>.Filter.Eq(s => s.SubmissionId, submissionId);
        return _ctx.SimilarityAnalyses.Find(filter).FirstOrDefaultAsync(ct)!;
    }

    public async Task<List<SimilarityAnalysis>> ListByAssignmentAsync(string assignmentId, CancellationToken ct = default)
    {
        var filter = Builders<SimilarityAnalysis>.Filter.Eq(s => s.AssignmentId, assignmentId);
        return await _ctx.SimilarityAnalyses.Find(filter).ToListAsync(ct);
    }

    public async Task UpsertAsync(SimilarityAnalysis analysis, CancellationToken ct = default)
    {
        var filter = Builders<SimilarityAnalysis>.Filter.Eq(s => s.SubmissionId, analysis.SubmissionId);
        var options = new ReplaceOptions { IsUpsert = true };
        analysis.UpdatedAt = DateTime.UtcNow;
        await _ctx.SimilarityAnalyses.ReplaceOneAsync(filter, analysis, options, ct);
    }

    public Task<UpdateResult> UpdateStatusAsync(string id, SimilarityAnalysisStatus status, DateTime updatedAt, CancellationToken ct = default)
    {
        var filter = Builders<SimilarityAnalysis>.Filter.Eq(s => s.Id, id);
        var update = Builders<SimilarityAnalysis>.Update
            .Set(s => s.Status, status)
            .Set(s => s.UpdatedAt, updatedAt);
        return _ctx.SimilarityAnalyses.UpdateOneAsync(filter, update, cancellationToken: ct);
    }
}
