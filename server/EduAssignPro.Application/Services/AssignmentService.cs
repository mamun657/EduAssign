using EduAssignPro.Application.Abstractions;
using EduAssignPro.Application.Dtos.Assignments;
using EduAssignPro.Application.Exceptions;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Domain.Enums;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace EduAssignPro.Application.Services;

public class AssignmentService
{
    private readonly IAssignmentRepository _assignments;
    private readonly ITeacherStudentSubjectRepository _teacherStudentSubjects;
    private readonly IUserRepository _users;
    private readonly ISubjectRepository _subjects;
    private readonly IFileRepository _files;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<AssignmentService> _logger;

    // Phase 4: file-type allowlist + size cap for assignment + submission uploads.
    // PDF + common image formats. Reject anything else so the storage bucket stays clean.
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
    private const long MaxAttachmentBytes = 10 * 1024 * 1024; // 10 MB

    public AssignmentService(
        IAssignmentRepository assignments,
        ITeacherStudentSubjectRepository teacherStudentSubjects,
        IUserRepository users,
        ISubjectRepository subjects,
        IFileRepository files,
        ICurrentUser currentUser,
        ILogger<AssignmentService> logger)
    {
        _assignments = assignments;
        _teacherStudentSubjects = teacherStudentSubjects;
        _users = users;
        _subjects = subjects;
        _files = files;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<AssignmentResponse> CreateAsync(CreateAssignmentRequest request, CancellationToken ct = default)
    {
        EnsureTeacher();

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ValidationException("Title is required.");

        var teacher = await GetCurrentUserAsync(ct);
        if (teacher.Role != Role.Teacher)
            throw new ForbiddenException("Only teachers can create assignments.");

        var student = await _users.GetByIdAsync(request.StudentId, ct)
            ?? throw new NotFoundException("Student not found.");
        if (student.Role != Role.Student)
            throw new ValidationException("Selected user is not a student.");

        var subject = await _subjects.GetByIdAsync(request.SubjectId, ct)
            ?? throw new NotFoundException("Subject not found.");

        if (!await _teacherStudentSubjects.ExistsAsync(teacher.Id, student.Id, subject.Id, ct))
            throw new ForbiddenException(
                "You are not authorized to create assignments for this student-subject. Please contact admin.");

        var assignment = new Assignment
        {
            TeacherId = teacher.Id,
            StudentId = student.Id,
            SubjectId = subject.Id,
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            DueDate = request.DueDate,
            IsPublished = false,
            IsActive = true,
            Status = AssignmentStatus.Draft
        };
        await _assignments.InsertAsync(assignment, ct);
        _logger.LogInformation("Assignment {Id} created by {Teacher}", assignment.Id, teacher.Email);
        return await BuildAsync(assignment, ct);
    }

    public async Task<List<AssignmentResponse>> ListAsync(CancellationToken ct = default)
    {
        var role = _currentUser.Role;
        FilterDefinition<Assignment> filter;

        if (role == Role.Admin.ToString())
        {
            filter = Builders<Assignment>.Filter.Empty;
        }
        else if (role == Role.Teacher.ToString())
        {
            filter = Builders<Assignment>.Filter.Eq(a => a.TeacherId, _currentUser.UserId);
        }
        else if (role == Role.Student.ToString())
        {
            filter = Builders<Assignment>.Filter.And(
                Builders<Assignment>.Filter.Eq(a => a.StudentId, _currentUser.UserId),
                Builders<Assignment>.Filter.Eq(a => a.IsPublished, true),
                Builders<Assignment>.Filter.Eq(a => a.IsActive, true));
        }
        else
        {
            throw new ForbiddenException("Not authorized to view assignments.");
        }

        var items = await _assignments.ListAsync(filter, ct);
        var responses = new List<AssignmentResponse>();
        foreach (var a in items) responses.Add(await BuildAsync(a, ct));
        return responses.OrderByDescending(r => r.CreatedAt).ToList();
    }

    public async Task<AssignmentResponse> GetByIdAsync(string id, CancellationToken ct = default)
    {
        var assignment = await _assignments.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Assignment not found.");
        EnsureCanAccess(assignment);
        return await BuildAsync(assignment, ct);
    }

    public async Task<AssignmentResponse> UpdateAsync(string id, UpdateAssignmentRequest request, CancellationToken ct = default)
    {
        EnsureTeacher();
        var assignment = await _assignments.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Assignment not found.");
        if (assignment.TeacherId != _currentUser.UserId)
            throw new ForbiddenException("You can only edit your own assignments.");

        var update = Builders<Assignment>.Update.Set(a => a.UpdatedAt, DateTime.UtcNow);
        if (!string.IsNullOrWhiteSpace(request.Title))
            update = update.Set(a => a.Title, request.Title.Trim());
        if (request.Description is not null)
            update = update.Set(a => a.Description, request.Description.Trim());
        if (request.DueDate.HasValue)
            update = update.Set(a => a.DueDate, request.DueDate.Value);

        await _assignments.UpdateAsync(id, update, ct);
        var updated = await _assignments.GetByIdAsync(id, ct);
        return await BuildAsync(updated!, ct);
    }

    public async Task DeleteAsync(string id, CancellationToken ct = default)
    {
        EnsureTeacher();
        var assignment = await _assignments.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Assignment not found.");
        if (assignment.TeacherId != _currentUser.UserId && _currentUser.Role != Role.Admin.ToString())
            throw new ForbiddenException("You can only delete your own assignments.");

        var deleted = await _assignments.DeleteAsync(id, ct);
        if (!deleted) throw new NotFoundException("Assignment not found.");
        _logger.LogInformation("Assignment {Id} deleted by {User}", id, _currentUser.Email);
    }

    public async Task<AssignmentResponse> PublishAsync(string id, CancellationToken ct = default)
    {
        EnsureTeacher();
        var assignment = await _assignments.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Assignment not found.");
        if (assignment.TeacherId != _currentUser.UserId)
            throw new ForbiddenException("You can only publish your own assignments.");

        var update = Builders<Assignment>.Update
            .Set(a => a.IsPublished, true)
            .Set(a => a.Status, AssignmentStatus.Published)
            .Set(a => a.UpdatedAt, DateTime.UtcNow);
        await _assignments.UpdateAsync(id, update, ct);
        var updated = await _assignments.GetByIdAsync(id, ct);
        return await BuildAsync(updated!, ct);
    }

    public async Task<AssignmentResponse> SubmitAsync(string id, SubmitAssignmentRequest request, CancellationToken ct = default)
    {
        EnsureStudent();
        var assignment = await _assignments.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Assignment not found.");
        if (assignment.StudentId != _currentUser.UserId)
            throw new ForbiddenException("You can only submit your own assignments.");
        if (!assignment.IsPublished)
            throw new ValidationException("This assignment is not published yet.");

        var update = Builders<Assignment>.Update
            .Set(a => a.SubmissionText, request.SubmissionText)
            .Set(a => a.SubmittedAt, DateTime.UtcNow)
            .Set(a => a.Status, AssignmentStatus.Submitted)
            .Set(a => a.UpdatedAt, DateTime.UtcNow);
        await _assignments.UpdateAsync(id, update, ct);
        var updated = await _assignments.GetByIdAsync(id, ct);
        return await BuildAsync(updated!, ct);
    }

    public async Task<AssignmentResponse> ReviewAsync(string id, ReviewSubmissionRequest request, CancellationToken ct = default)
    {
        EnsureTeacher();
        var assignment = await _assignments.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Assignment not found.");
        if (assignment.TeacherId != _currentUser.UserId)
            throw new ForbiddenException("You can only review your own assignments.");
        if (assignment.SubmittedAt is null)
            throw new ValidationException("Student has not submitted yet.");

        var update = Builders<Assignment>.Update
            .Set(a => a.Marks, request.Marks)
            .Set(a => a.Feedback, request.Feedback)
            .Set(a => a.Status, AssignmentStatus.Reviewed)
            .Set(a => a.UpdatedAt, DateTime.UtcNow);
        await _assignments.UpdateAsync(id, update, ct);
        var updated = await _assignments.GetByIdAsync(id, ct);
        return await BuildAsync(updated!, ct);
    }

    // ---- Phase 4: file attachment upload/download ----

    public async Task<StoredFileResponse> UploadAttachmentAsync(
        string id, Stream stream, string fileName, string contentType, CancellationToken ct = default)
    {
        EnsureTeacher();
        var assignment = await _assignments.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Assignment not found.");
        if (assignment.TeacherId != _currentUser.UserId)
            throw new ForbiddenException("You can only upload attachments to your own assignments.");

        ValidateUpload(fileName, contentType, stream);

        // Replace existing attachment if present.
        if (!string.IsNullOrEmpty(assignment.AttachmentFileId))
        {
            try { await _files.DeleteAsync(assignment.AttachmentFileId!, ct); } catch { /* best-effort */ }
        }

        var stored = await _files.UploadAsync(stream, fileName, contentType, ct);
        var update = Builders<Assignment>.Update
            .Set(a => a.AttachmentFileId, stored.Id)
            .Set(a => a.AttachmentFileName, stored.FileName)
            .Set(a => a.AttachmentContentType, stored.ContentType)
            .Set(a => a.AttachmentSize, stored.Size)
            .Set(a => a.UpdatedAt, DateTime.UtcNow);
        await _assignments.UpdateAsync(id, update, ct);
        _logger.LogInformation("Assignment {Id} attachment uploaded: {File} ({Size} bytes)", id, stored.FileName, stored.Size);
        return new StoredFileResponse(stored.Id, stored.FileName, stored.ContentType, stored.Size);
    }

    public async Task<StoredFile> GetAttachmentAsync(string id, CancellationToken ct = default)
    {
        var assignment = await _assignments.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Assignment not found.");
        EnsureCanAccess(assignment);
        if (string.IsNullOrEmpty(assignment.AttachmentFileId))
            throw new NotFoundException("This assignment has no attachment.");
        var stored = await _files.GetAsync(assignment.AttachmentFileId!, ct)
            ?? throw new NotFoundException("Attachment file not found.");
        return stored;
    }

    public async Task<StoredFileResponse> UploadSubmissionFileAsync(
        string id, Stream stream, string fileName, string contentType, CancellationToken ct = default)
    {
        EnsureStudent();
        var assignment = await _assignments.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Assignment not found.");
        if (assignment.StudentId != _currentUser.UserId)
            throw new ForbiddenException("You can only submit your own assignments.");
        if (!assignment.IsPublished)
            throw new ValidationException("This assignment is not published yet.");
        if (assignment.SubmittedAt is not null)
            throw new ConflictException("This assignment has already been submitted. Use resubmit instead.");

        ValidateUpload(fileName, contentType, stream);

        // Replace existing submission file if any (allows re-uploading before submit).
        if (!string.IsNullOrEmpty(assignment.SubmissionFileId))
        {
            try { await _files.DeleteAsync(assignment.SubmissionFileId!, ct); } catch { /* best-effort */ }
        }

        var stored = await _files.UploadAsync(stream, fileName, contentType, ct);
        var update = Builders<Assignment>.Update
            .Set(a => a.SubmissionFileId, stored.Id)
            .Set(a => a.SubmissionFileName, stored.FileName)
            .Set(a => a.SubmissionContentType, stored.ContentType)
            .Set(a => a.SubmissionSize, stored.Size)
            .Set(a => a.UpdatedAt, DateTime.UtcNow);
        await _assignments.UpdateAsync(id, update, ct);
        _logger.LogInformation("Assignment {Id} submission file uploaded: {File} ({Size} bytes)", id, stored.FileName, stored.Size);
        return new StoredFileResponse(stored.Id, stored.FileName, stored.ContentType, stored.Size);
    }

    public async Task<StoredFile> GetSubmissionFileAsync(string id, CancellationToken ct = default)
    {
        EnsureTeacher();
        var assignment = await _assignments.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Assignment not found.");
        if (assignment.TeacherId != _currentUser.UserId)
            throw new ForbiddenException("You can only download submissions for your own assignments.");
        if (string.IsNullOrEmpty(assignment.SubmissionFileId))
            throw new NotFoundException("This assignment has no submission file.");
        var stored = await _files.GetAsync(assignment.SubmissionFileId!, ct)
            ?? throw new NotFoundException("Submission file not found.");
        return stored;
    }

    private static void ValidateUpload(string fileName, string contentType, Stream stream)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            throw new ValidationException("File name is required.");
        if (!AllowedContentTypes.Contains(contentType ?? ""))
            throw new ValidationException(
                "Unsupported file type. Allowed: PDF, PNG, JPEG, GIF, WebP, TXT, DOC, DOCX.");
        if (stream.CanSeek && stream.Length > MaxAttachmentBytes)
            throw new ValidationException($"File too large. Max size is {MaxAttachmentBytes / (1024 * 1024)} MB.");
    }

    private void EnsureCanAccess(Assignment assignment)
    {
        var role = _currentUser.Role;
        if (role == Role.Admin.ToString()) return;
        if (role == Role.Teacher.ToString() && assignment.TeacherId == _currentUser.UserId) return;
        if (role == Role.Student.ToString()
            && assignment.StudentId == _currentUser.UserId
            && assignment.IsPublished) return;
        throw new ForbiddenException("You are not authorized to view this assignment.");
    }

    private async Task<AssignmentResponse> BuildAsync(Assignment a, CancellationToken ct)
    {
        var teacher = await _users.GetByIdAsync(a.TeacherId, ct);
        var student = await _users.GetByIdAsync(a.StudentId, ct);
        var subject = await _subjects.GetByIdAsync(a.SubjectId, ct);
        return new AssignmentResponse(
            a.Id,
            a.TeacherId, teacher != null ? $"{teacher.FirstName} {teacher.LastName}" : "Unknown",
            a.StudentId, student != null ? $"{student.FirstName} {student.LastName}" : "Unknown",
            a.SubjectId, subject?.Name ?? "Unknown",
            a.Title, a.Description, a.DueDate, a.IsPublished, a.IsActive,
            a.SubmissionText, a.SubmittedAt, a.Marks, a.Feedback, a.Status.ToString(),
            a.CreatedAt, a.UpdatedAt,
            a.AttachmentFileName, a.AttachmentContentType, a.AttachmentSize,
            a.SubmissionFileName, a.SubmissionContentType, a.SubmissionSize);
    }

    private async Task<User> GetCurrentUserAsync(CancellationToken ct)
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrEmpty(_currentUser.UserId))
            throw new UnauthorizedException();
        return await _users.GetByIdAsync(_currentUser.UserId, ct)
            ?? throw new NotFoundException("User not found.");
    }

    private void EnsureTeacher()
    {
        if (_currentUser.Role != Role.Teacher.ToString())
            throw new ForbiddenException("Only teachers can perform this action.");
    }

    private void EnsureStudent()
    {
        if (_currentUser.Role != Role.Student.ToString())
            throw new ForbiddenException("Only students can perform this action.");
    }
}