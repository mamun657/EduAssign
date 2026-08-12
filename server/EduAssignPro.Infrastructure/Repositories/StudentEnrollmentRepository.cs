using EduAssignPro.Application.Abstractions;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Infrastructure.Mongo;
using MongoDB.Driver;

namespace EduAssignPro.Infrastructure.Repositories;

public class StudentEnrollmentRepository : IStudentEnrollmentRepository
{
    private readonly MongoContext _ctx;

    public StudentEnrollmentRepository(MongoContext ctx)
    {
        _ctx = ctx;
    }

    public Task<StudentSubjectEnrollment?> GetAsync(string studentId, string subjectId, CancellationToken ct = default)
        => _ctx.StudentSubjectEnrollments.Find(e => e.StudentId == studentId && e.SubjectId == subjectId).FirstOrDefaultAsync(ct)!;

    public Task<List<StudentSubjectEnrollment>> ListByStudentAsync(string studentId, CancellationToken ct = default)
        => _ctx.StudentSubjectEnrollments.Find(e => e.StudentId == studentId).ToListAsync(ct);

    public Task<List<StudentSubjectEnrollment>> ListByStudentsAsync(IEnumerable<string> studentIds, CancellationToken ct = default)
    {
        var ids = studentIds.ToList();
        var filter = Builders<StudentSubjectEnrollment>.Filter.In(e => e.StudentId, ids);
        return _ctx.StudentSubjectEnrollments.Find(filter).ToListAsync(ct);
    }

    public Task InsertAsync(StudentSubjectEnrollment enrollment, CancellationToken ct = default)
        => _ctx.StudentSubjectEnrollments.InsertOneAsync(enrollment, cancellationToken: ct);

    public async Task<bool> DeleteAsync(string studentId, string subjectId, CancellationToken ct = default)
    {
        var result = await _ctx.StudentSubjectEnrollments.DeleteOneAsync(
            e => e.StudentId == studentId && e.SubjectId == subjectId, ct);
        return result.IsAcknowledged && result.DeletedCount > 0;
    }

    public async Task<long> DeleteByStudentAsync(string studentId, CancellationToken ct = default)
    {
        var result = await _ctx.StudentSubjectEnrollments.DeleteManyAsync(
            e => e.StudentId == studentId, ct);
        return result.IsAcknowledged ? result.DeletedCount : 0L;
    }
}
