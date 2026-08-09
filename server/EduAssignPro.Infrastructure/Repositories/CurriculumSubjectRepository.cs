using EduAssignPro.Application.Abstractions;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Infrastructure.Mongo;
using MongoDB.Driver;

namespace EduAssignPro.Infrastructure.Repositories;

public class CurriculumSubjectRepository : ICurriculumSubjectRepository
{
    private readonly MongoContext _ctx;

    public CurriculumSubjectRepository(MongoContext ctx)
    {
        _ctx = ctx;
    }

    public Task<CurriculumSubject?> GetByIdAsync(string id, CancellationToken ct = default)
        => _ctx.CurriculumSubjects.Find(c => c.Id == id).FirstOrDefaultAsync(ct)!;

    public Task<List<CurriculumSubject>> ListByAcademicLevelAsync(string academicLevelId, CancellationToken ct = default)
        => _ctx.CurriculumSubjects.Find(c => c.AcademicLevelId == academicLevelId).ToListAsync(ct);

    public Task<CurriculumSubject?> FindByAcademicLevelAndSubjectAsync(string academicLevelId, string subjectId, CancellationToken ct = default)
        => _ctx.CurriculumSubjects.Find(c => c.AcademicLevelId == academicLevelId && c.SubjectId == subjectId).FirstOrDefaultAsync(ct)!;

    public Task UpsertAsync(CurriculumSubject curriculumSubject, CancellationToken ct = default)
    {
        var filter = Builders<CurriculumSubject>.Filter.And(
            Builders<CurriculumSubject>.Filter.Eq(c => c.AcademicLevelId, curriculumSubject.AcademicLevelId),
            Builders<CurriculumSubject>.Filter.Eq(c => c.SubjectId, curriculumSubject.SubjectId));
        var update = Builders<CurriculumSubject>.Update
            .Set(c => c.IsCompulsory, curriculumSubject.IsCompulsory)
            .Set(c => c.ElectiveGroup, curriculumSubject.ElectiveGroup)
            .Set(c => c.MaxChoicesInGroup, curriculumSubject.MaxChoicesInGroup)
            .Set(c => c.ElectiveOption, curriculumSubject.ElectiveOption)
            .Set(c => c.IsActive, curriculumSubject.IsActive)
            .Set(c => c.UpdatedAt, DateTime.UtcNow)
            .SetOnInsert(c => c.AcademicLevelId, curriculumSubject.AcademicLevelId)
            .SetOnInsert(c => c.SubjectId, curriculumSubject.SubjectId)
            .SetOnInsert(c => c.CreatedAt, DateTime.UtcNow);
        return _ctx.CurriculumSubjects.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true }, ct);
    }

    public async Task<bool> ExistsAsync(string academicLevelId, string subjectId, CancellationToken ct = default)
        => await _ctx.CurriculumSubjects.Find(c => c.AcademicLevelId == academicLevelId && c.SubjectId == subjectId).AnyAsync(ct);
}
