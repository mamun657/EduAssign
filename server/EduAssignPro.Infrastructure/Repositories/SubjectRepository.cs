using EduAssignPro.Application.Abstractions;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Infrastructure.Mongo;
using MongoDB.Driver;

namespace EduAssignPro.Infrastructure.Repositories;

public class SubjectRepository : ISubjectRepository
{
    private readonly MongoContext _ctx;

    public SubjectRepository(MongoContext ctx)
    {
        _ctx = ctx;
    }

    public Task<Subject?> GetByIdAsync(string id, CancellationToken ct = default)
        => _ctx.Subjects.Find(s => s.Id == id).FirstOrDefaultAsync(ct)!;

    public Task<List<Subject>> ListAsync(CancellationToken ct = default)
        => _ctx.Subjects.Find(FilterDefinition<Subject>.Empty).ToListAsync(ct);

    public Task UpsertByCodeAsync(Subject subject, CancellationToken ct = default)
    {
        var filter = Builders<Subject>.Filter.Eq(s => s.Code, subject.Code);
        var update = Builders<Subject>.Update
            .Set(s => s.Name, subject.Name)
            .Set(s => s.IsActive, subject.IsActive)
            .Set(s => s.UpdatedAt, DateTime.UtcNow)
            .SetOnInsert(s => s.Code, subject.Code)
            .SetOnInsert(s => s.CreatedAt, DateTime.UtcNow);
        return _ctx.Subjects.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true }, ct);
    }
}
