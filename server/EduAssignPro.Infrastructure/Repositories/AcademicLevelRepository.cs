using EduAssignPro.Application.Abstractions;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Infrastructure.Mongo;
using MongoDB.Driver;

namespace EduAssignPro.Infrastructure.Repositories;

public class AcademicLevelRepository : IAcademicLevelRepository
{
    private readonly MongoContext _ctx;

    public AcademicLevelRepository(MongoContext ctx)
    {
        _ctx = ctx;
    }

    public Task<AcademicLevel?> GetByIdAsync(string id, CancellationToken ct = default)
        => _ctx.AcademicLevels.Find(a => a.Id == id).FirstOrDefaultAsync(ct)!;

    public Task<AcademicLevel?> GetByCodeAsync(string code, CancellationToken ct = default)
        => _ctx.AcademicLevels.Find(a => a.Code == code).FirstOrDefaultAsync(ct)!;

    public Task<List<AcademicLevel>> ListAsync(CancellationToken ct = default)
        => _ctx.AcademicLevels.Find(FilterDefinition<AcademicLevel>.Empty).ToListAsync(ct);

    public Task UpsertByCodeAsync(AcademicLevel level, CancellationToken ct = default)
    {
        var filter = Builders<AcademicLevel>.Filter.Eq(a => a.Code, level.Code);
        var update = Builders<AcademicLevel>.Update
            .Set(a => a.Name, level.Name)
            .Set(a => a.Description, level.Description)
            .Set(a => a.IsActive, level.IsActive)
            .Set(a => a.UpdatedAt, DateTime.UtcNow)
            .SetOnInsert(a => a.Code, level.Code)
            .SetOnInsert(a => a.CreatedAt, DateTime.UtcNow);
        return _ctx.AcademicLevels.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true }, ct);
    }
}
