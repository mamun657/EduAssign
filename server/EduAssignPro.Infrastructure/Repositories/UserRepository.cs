using EduAssignPro.Application.Abstractions;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Infrastructure.Mongo;
using MongoDB.Driver;

namespace EduAssignPro.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly MongoContext _ctx;

    public UserRepository(MongoContext ctx)
    {
        _ctx = ctx;
    }

    public Task<User?> GetByIdAsync(string id, CancellationToken ct = default)
        => _ctx.Users.Find(u => u.Id == id).FirstOrDefaultAsync(ct)!;

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default)
        => _ctx.Users.Find(u => u.Email == email.Trim().ToLowerInvariant()).FirstOrDefaultAsync(ct)!;

    public Task<List<User>> ListAsync(FilterDefinition<User>? filter = null, CancellationToken ct = default)
    {
        filter ??= FilterDefinition<User>.Empty;
        return _ctx.Users.Find(filter).ToListAsync(ct);
    }

    public Task InsertAsync(User user, CancellationToken ct = default)
        => _ctx.Users.InsertOneAsync(user, cancellationToken: ct);

    public async Task<bool> EmailExistsAsync(string email, CancellationToken ct = default)
    {
        var normalized = email.Trim().ToLowerInvariant();
        return await _ctx.Users.Find(u => u.Email == normalized).AnyAsync(ct);
    }

    public Task<UpdateResult> UpdateAsync(string id, UpdateDefinition<User> update, CancellationToken ct = default)
        => _ctx.Users.UpdateOneAsync(u => u.Id == id, update, cancellationToken: ct);
}
