using EduAssignPro.Application.Abstractions;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Infrastructure.Mongo;
using MongoDB.Driver;

namespace EduAssignPro.Infrastructure.Repositories;

public class TeacherStudentSubjectRepository : ITeacherStudentSubjectRepository
{
    private readonly MongoContext _ctx;

    public TeacherStudentSubjectRepository(MongoContext ctx)
    {
        _ctx = ctx;
    }

    public Task<TeacherStudentSubject?> GetByIdAsync(string id, CancellationToken ct = default)
        => _ctx.TeacherStudentSubjects.Find(t => t.Id == id).FirstOrDefaultAsync(ct)!;

    public Task<List<TeacherStudentSubject>> ListAsync(FilterDefinition<TeacherStudentSubject>? filter = null, CancellationToken ct = default)
    {
        filter ??= FilterDefinition<TeacherStudentSubject>.Empty;
        return _ctx.TeacherStudentSubjects.Find(filter).ToListAsync(ct);
    }

    public async Task<bool> ExistsAsync(string teacherId, string studentId, string subjectId, CancellationToken ct = default)
        => await _ctx.TeacherStudentSubjects.Find(t => t.TeacherId == teacherId && t.StudentId == studentId && t.SubjectId == subjectId).AnyAsync(ct);

    public Task InsertAsync(TeacherStudentSubject tss, CancellationToken ct = default)
        => _ctx.TeacherStudentSubjects.InsertOneAsync(tss, cancellationToken: ct);

    public async Task<bool> DeleteAsync(string id, CancellationToken ct = default)
    {
        var result = await _ctx.TeacherStudentSubjects.DeleteOneAsync(t => t.Id == id, ct);
        return result.IsAcknowledged && result.DeletedCount > 0;
    }
}
