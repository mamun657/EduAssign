using EduAssignPro.Application.Abstractions;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Infrastructure.Mongo;
using MongoDB.Driver;

namespace EduAssignPro.Infrastructure.Repositories;

public class AssignmentRepository : IAssignmentRepository
{
    private readonly MongoContext _ctx;

    public AssignmentRepository(MongoContext ctx)
    {
        _ctx = ctx;
    }

    public Task<Assignment?> GetByIdAsync(string id, CancellationToken ct = default)
        => _ctx.Assignments.Find(a => a.Id == id).FirstOrDefaultAsync(ct)!;

    public Task<List<Assignment>> ListAsync(FilterDefinition<Assignment>? filter = null, CancellationToken ct = default)
    {
        filter ??= FilterDefinition<Assignment>.Empty;
        return _ctx.Assignments.Find(filter).ToListAsync(ct);
    }

    public Task InsertAsync(Assignment assignment, CancellationToken ct = default)
        => _ctx.Assignments.InsertOneAsync(assignment, cancellationToken: ct);

    public Task<UpdateResult> UpdateAsync(string id, UpdateDefinition<Assignment> update, CancellationToken ct = default)
        => _ctx.Assignments.UpdateOneAsync(a => a.Id == id, update, cancellationToken: ct);

    public async Task<bool> DeleteAsync(string id, CancellationToken ct = default)
    {
        var result = await _ctx.Assignments.DeleteOneAsync(a => a.Id == id, ct);
        return result.IsAcknowledged && result.DeletedCount > 0;
    }
}
