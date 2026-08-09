using EduAssignPro.Application.Abstractions;
using EduAssignPro.Application.Dtos.Admin;
using EduAssignPro.Application.Exceptions;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Domain.Enums;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace EduAssignPro.Application.Services;

public class TeacherStudentSubjectService
{
    private readonly ITeacherStudentSubjectRepository _teacherStudentSubjects;
    private readonly IUserRepository _users;
    private readonly ISubjectRepository _subjects;
    private readonly IStudentEnrollmentRepository _enrollments;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<TeacherStudentSubjectService> _logger;

    public TeacherStudentSubjectService(
        ITeacherStudentSubjectRepository teacherStudentSubjects,
        IUserRepository users,
        ISubjectRepository subjects,
        IStudentEnrollmentRepository enrollments,
        ICurrentUser currentUser,
        ILogger<TeacherStudentSubjectService> logger)
    {
        _teacherStudentSubjects = teacherStudentSubjects;
        _users = users;
        _subjects = subjects;
        _enrollments = enrollments;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<TeacherAssignmentResponse> AssignAsync(TeacherAssignmentRequest request, CancellationToken ct = default)
    {
        EnsureAdmin();

        var teacher = await _users.GetByIdAsync(request.TeacherId, ct)
            ?? throw new NotFoundException("Teacher not found.");
        if (teacher.Role != Role.Teacher)
            throw new ValidationException("Selected user is not a Teacher.");

        var student = await _users.GetByIdAsync(request.StudentId, ct)
            ?? throw new NotFoundException("Student not found.");
        if (student.Role != Role.Student)
            throw new ValidationException("Selected user is not a Student.");

        var subject = await _subjects.GetByIdAsync(request.SubjectId, ct)
            ?? throw new NotFoundException("Subject not found.");
        if (!subject.IsActive)
            throw new ValidationException("Subject is not active.");

        var enrollment = await _enrollments.GetAsync(student.Id, subject.Id, ct);
        if (enrollment is null)
            throw new ValidationException("Student is not enrolled in this subject.");

        if (await _teacherStudentSubjects.ExistsAsync(teacher.Id, student.Id, subject.Id, ct))
            throw new ConflictException("This teacher-student-subject assignment already exists.");

        var tss = new TeacherStudentSubject
        {
            TeacherId = teacher.Id,
            StudentId = student.Id,
            SubjectId = subject.Id,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };
        await _teacherStudentSubjects.InsertAsync(tss, ct);
        _logger.LogInformation("Assigned Teacher {Teacher} -> Student {Student} -> Subject {Subject}",
            teacher.Email, student.Email, subject.Code);

        return new TeacherAssignmentResponse(
            tss.Id, teacher.Id, $"{teacher.FirstName} {teacher.LastName}",
            student.Id, $"{student.FirstName} {student.LastName}",
            subject.Id, subject.Name, tss.CreatedAt, tss.IsActive);
    }

    public async Task<List<TeacherAssignmentResponse>> ListAsync(CancellationToken ct = default)
    {
        EnsureAdmin();
        var items = await _teacherStudentSubjects.ListAsync(ct: ct);
        return await BuildListAsync(items, ct);
    }

    public async Task<List<TeacherAssignmentResponse>> ListForTeacherAsync(CancellationToken ct = default)
    {
        EnsureTeacher();
        var filter = Builders<TeacherStudentSubject>.Filter.Eq(t => t.TeacherId, _currentUser.UserId);
        var items = await _teacherStudentSubjects.ListAsync(filter, ct);
        return await BuildListAsync(items, ct);
    }

    public async Task<List<TeacherAssignmentResponse>> ListForStudentAsync(CancellationToken ct = default)
    {
        EnsureStudent();
        var filter = Builders<TeacherStudentSubject>.Filter.Eq(t => t.StudentId, _currentUser.UserId);
        var items = await _teacherStudentSubjects.ListAsync(filter, ct);
        return await BuildListAsync(items, ct);
    }

    public async Task DeleteAsync(string id, CancellationToken ct = default)
    {
        EnsureAdmin();
        var item = await _teacherStudentSubjects.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Teacher assignment not found.");
        var deleted = await _teacherStudentSubjects.DeleteAsync(id, ct);
        if (!deleted) throw new NotFoundException("Teacher assignment not found.");
        _logger.LogInformation("Admin deleted teacher assignment {Id}", id);
    }

    private async Task<List<TeacherAssignmentResponse>> BuildListAsync(
        List<TeacherStudentSubject> items, CancellationToken ct)
    {
        var result = new List<TeacherAssignmentResponse>();
        foreach (var tss in items)
        {
            var teacher = await _users.GetByIdAsync(tss.TeacherId, ct);
            var student = await _users.GetByIdAsync(tss.StudentId, ct);
            var subject = await _subjects.GetByIdAsync(tss.SubjectId, ct);
            if (teacher is null || student is null || subject is null) continue;
            result.Add(new TeacherAssignmentResponse(
                tss.Id,
                teacher.Id, $"{teacher.FirstName} {teacher.LastName}",
                student.Id, $"{student.FirstName} {student.LastName}",
                subject.Id, subject.Name,
                tss.CreatedAt, tss.IsActive));
        }
        return result.OrderByDescending(r => r.CreatedAt).ToList();
    }

    private void EnsureAdmin()
    {
        if (_currentUser.Role != Role.Admin.ToString())
            throw new ForbiddenException("Only admin can assign teachers.");
    }

    private void EnsureTeacher()
    {
        if (_currentUser.Role != Role.Teacher.ToString())
            throw new ForbiddenException("Only teachers can view teacher assignments.");
    }

    private void EnsureStudent()
    {
        if (_currentUser.Role != Role.Student.ToString())
            throw new ForbiddenException("Only students can view their teacher assignments.");
    }
}