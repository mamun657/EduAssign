using EduAssignPro.Domain.Entities;
using MongoDB.Driver;

namespace EduAssignPro.Application.Abstractions;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<List<User>> ListAsync(FilterDefinition<User>? filter = null, CancellationToken ct = default);
    Task InsertAsync(User user, CancellationToken ct = default);
    Task<bool> EmailExistsAsync(string email, CancellationToken ct = default);
    Task<UpdateResult> UpdateAsync(string id, UpdateDefinition<User> update, CancellationToken ct = default);
}

public interface IAcademicLevelRepository
{
    Task<AcademicLevel?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<AcademicLevel?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<List<AcademicLevel>> ListAsync(CancellationToken ct = default);
    Task UpsertByCodeAsync(AcademicLevel level, CancellationToken ct = default);
}

public interface ISubjectRepository
{
    Task<Subject?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<List<Subject>> ListAsync(CancellationToken ct = default);
    Task UpsertByCodeAsync(Subject subject, CancellationToken ct = default);
}

public interface ICurriculumSubjectRepository
{
    Task<CurriculumSubject?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<List<CurriculumSubject>> ListByAcademicLevelAsync(string academicLevelId, CancellationToken ct = default);
    Task<CurriculumSubject?> FindByAcademicLevelAndSubjectAsync(string academicLevelId, string subjectId, CancellationToken ct = default);
    Task UpsertAsync(CurriculumSubject curriculumSubject, CancellationToken ct = default);
    Task<bool> ExistsAsync(string academicLevelId, string subjectId, CancellationToken ct = default);
}

public interface IStudentEnrollmentRepository
{
    Task<StudentSubjectEnrollment?> GetAsync(string studentId, string subjectId, CancellationToken ct = default);
    Task<List<StudentSubjectEnrollment>> ListByStudentAsync(string studentId, CancellationToken ct = default);
    Task<List<StudentSubjectEnrollment>> ListByStudentsAsync(IEnumerable<string> studentIds, CancellationToken ct = default);
    Task InsertAsync(StudentSubjectEnrollment enrollment, CancellationToken ct = default);
    Task<bool> DeleteAsync(string studentId, string subjectId, CancellationToken ct = default);
}

public interface ITeacherStudentSubjectRepository
{
    Task<TeacherStudentSubject?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<List<TeacherStudentSubject>> ListAsync(FilterDefinition<TeacherStudentSubject>? filter = null, CancellationToken ct = default);
    Task<bool> ExistsAsync(string teacherId, string studentId, string subjectId, CancellationToken ct = default);
    Task InsertAsync(TeacherStudentSubject tss, CancellationToken ct = default);
    Task<bool> DeleteAsync(string id, CancellationToken ct = default);
}

public interface IAssignmentRepository
{
    Task<Assignment?> GetByIdAsync(string id, CancellationToken ct = default);
    Task<List<Assignment>> ListAsync(FilterDefinition<Assignment>? filter = null, CancellationToken ct = default);
    Task InsertAsync(Assignment assignment, CancellationToken ct = default);
    Task<UpdateResult> UpdateAsync(string id, UpdateDefinition<Assignment> update, CancellationToken ct = default);
    Task<bool> DeleteAsync(string id, CancellationToken ct = default);
}

public class StoredFile
{
    public string Id { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long Size { get; set; }
    private Func<Stream>? _openReadStream;
    public void WithOpenStream(Func<Stream> factory) => _openReadStream = factory;
    public Stream OpenReadStream()
    {
        if (_openReadStream is null)
            throw new InvalidOperationException("No stream factory set on this StoredFile.");
        return _openReadStream();
    }
}

public interface IFileRepository
{
    Task<StoredFile> UploadAsync(Stream stream, string fileName, string contentType, CancellationToken ct = default);
    Task<StoredFile?> GetAsync(string id, CancellationToken ct = default);
    Task DeleteAsync(string id, CancellationToken ct = default);
}

public interface IUnitOfWork
{
    Task EnsureIndexesAsync(CancellationToken ct = default);
}
