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

    public async Task<long> DeleteByStudentAsync(string studentId, CancellationToken ct = default)
    {
        var filter = Builders<SimilarityAnalysis>.Filter.Eq(s => s.StudentId, studentId);
        var result = await _ctx.SimilarityAnalyses.DeleteManyAsync(filter, ct);
        return result.IsAcknowledged ? result.DeletedCount : 0L;
    }

    /// <summary>
    /// Deletes analyses whose assignment belongs to the given teacher.
    /// Implemented by first collecting assignment ids owned by the teacher and
    /// then matching analyses whose <c>AssignmentId</c> is in that set.
    /// </summary>
    public async Task<long> DeleteByTeacherAsync(string teacherId, CancellationToken ct = default)
    {
        var assignmentIds = await _ctx.Assignments
            .Find(Builders<Assignment>.Filter.Eq(a => a.TeacherId, teacherId))
            .Project(a => a.Id)
            .ToListAsync(ct);
        if (assignmentIds.Count == 0) return 0L;

        var filter = Builders<SimilarityAnalysis>.Filter.In(s => s.AssignmentId, assignmentIds);
        var result = await _ctx.SimilarityAnalyses.DeleteManyAsync(filter, ct);
        return result.IsAcknowledged ? result.DeletedCount : 0L;
    }
}
