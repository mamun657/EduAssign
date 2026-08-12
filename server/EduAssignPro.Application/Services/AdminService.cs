using EduAssignPro.Application.Abstractions;
using EduAssignPro.Application.Dtos.Admin;
using EduAssignPro.Application.Exceptions;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace EduAssignPro.Application.Services;

public class AdminService
{
    private readonly IUserRepository _users;
    private readonly IAcademicLevelRepository _academicLevels;
    private readonly ICurriculumSubjectRepository _curriculumSubjects;
    private readonly ISubjectRepository _subjects;
    private readonly IStudentEnrollmentRepository _enrollments;
    private readonly ITeacherStudentSubjectRepository _teacherStudentSubjects;
    private readonly IAssignmentRepository _assignments;
    private readonly ISimilarityAnalysisRepository _similarityAnalyses;
    private readonly ICurrentUser _currentUser;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger<AdminService> _logger;

    public AdminService(
        IUserRepository users,
        IAcademicLevelRepository academicLevels,
        ICurriculumSubjectRepository curriculumSubjects,
        ISubjectRepository subjects,
        IStudentEnrollmentRepository enrollments,
        ITeacherStudentSubjectRepository teacherStudentSubjects,
        IAssignmentRepository assignments,
        ISimilarityAnalysisRepository similarityAnalyses,
        ICurrentUser currentUser,
        IPasswordHasher passwordHasher,
        ILogger<AdminService> logger)
    {
        _users = users;
        _academicLevels = academicLevels;
        _curriculumSubjects = curriculumSubjects;
        _subjects = subjects;
        _enrollments = enrollments;
        _teacherStudentSubjects = teacherStudentSubjects;
        _assignments = assignments;
        _similarityAnalyses = similarityAnalyses;
        _currentUser = currentUser;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task<List<AdminStudentListItem>> ListStudentsAsync(CancellationToken ct = default)
    {
        EnsureAdmin();
        var students = await _users.ListAsync(filter: null, ct: ct);
        var studentList = students.Where(u => u.Role == Role.Student).ToList();
        var levels = await _academicLevels.ListAsync(ct);
        var levelMap = levels.ToDictionary(l => l.Id);

        return studentList
            .OrderBy(s => s.LastName).ThenBy(s => s.FirstName)
            .Select(s => new AdminStudentListItem(
                s.Id, s.FirstName, s.LastName, s.Email,
                s.Role.ToString(),
                s.AcademicLevelId,
                s.AcademicLevelId != null && levelMap.TryGetValue(s.AcademicLevelId, out var lvl) ? lvl.Code : null,
                s.AcademicLevelId != null && levelMap.TryGetValue(s.AcademicLevelId, out var lvl2) ? lvl2.Name : null,
                s.IsActive, s.CreatedAt))
            .ToList();
    }

    public async Task<AdminStudentDetail> GetStudentDetailAsync(string id, CancellationToken ct = default)
    {
        EnsureAdmin();
        var student = await _users.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Student not found.");
        if (student.Role != Role.Student)
            throw new ValidationException("User is not a student.");

        AcademicLevel? level = null;
        if (!string.IsNullOrEmpty(student.AcademicLevelId))
            level = await _academicLevels.GetByIdAsync(student.AcademicLevelId, ct);

        var enrollments = await _enrollments.ListByStudentAsync(student.Id, ct);
        var selectedItems = new List<AdminStudentSubjectItem>();
        var selectedSubjectIds = enrollments.Select(e => e.SubjectId).ToHashSet();

        foreach (var e in enrollments)
        {
            var subject = await _subjects.GetByIdAsync(e.SubjectId, ct);
            if (subject is null) continue;
            var cs = await _curriculumSubjects.GetByIdAsync(e.CurriculumSubjectId, ct);
            selectedItems.Add(new AdminStudentSubjectItem(
                subject.Id, subject.Code, subject.Name,
                cs?.IsCompulsory ?? false, cs?.ElectiveGroup, cs?.ElectiveOption));
        }

        var availableNotSelected = new List<AdminStudentSubjectItem>();
        if (level is not null)
        {
            var curriculum = await _curriculumSubjects.ListByAcademicLevelAsync(level.Id, ct);
            foreach (var cs in curriculum)
            {
                if (selectedSubjectIds.Contains(cs.SubjectId)) continue;
                var subject = await _subjects.GetByIdAsync(cs.SubjectId, ct);
                if (subject is null) continue;
                availableNotSelected.Add(new AdminStudentSubjectItem(
                    subject.Id, subject.Code, subject.Name, cs.IsCompulsory, cs.ElectiveGroup, cs.ElectiveOption));
            }
        }

        return new AdminStudentDetail(
            student.Id, student.FirstName, student.LastName, student.Email,
            student.PhoneNumber, student.Role.ToString(),
            level?.Id, level?.Code, level?.Name,
            student.IsActive, student.CreatedAt,
            selectedItems.OrderBy(x => x.IsCompulsory ? 0 : 1).ThenBy(x => x.SubjectName).ToList(),
            availableNotSelected.OrderBy(x => x.IsCompulsory ? 0 : 1).ThenBy(x => x.SubjectName).ToList());
    }

    public async Task<List<AdminTeacherListItem>> ListTeachersAsync(CancellationToken ct = default)
    {
        EnsureAdmin();
        var users = await _users.ListAsync(filter: null, ct: ct);
        var teachers = users.Where(u => u.Role == Role.Teacher).ToList();
        var levels = await _academicLevels.ListAsync(ct);
        var levelMap = levels.ToDictionary(l => l.Id);

        return teachers
            .OrderBy(t => t.LastName).ThenBy(t => t.FirstName)
            .Select(t => new AdminTeacherListItem(
                t.Id, t.FirstName, t.LastName, t.Email, t.PhoneNumber,
                t.AcademicLevelId,
                t.AcademicLevelId != null && levelMap.TryGetValue(t.AcademicLevelId, out var lvl) ? lvl.Name : null,
                t.IsActive, t.CreatedAt))
            .ToList();
    }

    public async Task<AdminTeacherListItem> CreateTeacherAsync(CreateTeacherRequest request, CancellationToken ct = default)
    {
        EnsureAdmin();
        if (string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName))
            throw new ValidationException("First name and last name are required.");
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            throw new ValidationException("Email and password are required.");
        if (request.Password.Length < 8)
            throw new ValidationException("Password must be at least 8 characters.");

        var email = request.Email.Trim().ToLowerInvariant();
        if (await _users.EmailExistsAsync(email, ct))
            throw new ConflictException("An account with this email already exists.");

        string? academicLevelId = null;
        if (!string.IsNullOrWhiteSpace(request.AcademicLevelId))
        {
            var lvl = await _academicLevels.GetByIdAsync(request.AcademicLevelId, ct)
                ?? throw new ValidationException("Selected academic level does not exist.");
            academicLevelId = lvl.Id;
        }

        var teacher = new User
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            PasswordHash = _passwordHasher.Hash(request.Password),
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            Role = Role.Teacher,
            AcademicLevelId = academicLevelId,
            IsActive = true
        };
        await _users.InsertAsync(teacher, ct);

        var levels = await _academicLevels.ListAsync(ct);
        var levelName = academicLevelId != null
            ? levels.FirstOrDefault(l => l.Id == academicLevelId)?.Name
            : null;
        return new AdminTeacherListItem(
            teacher.Id, teacher.FirstName, teacher.LastName, teacher.Email, teacher.PhoneNumber,
            teacher.AcademicLevelId, levelName, teacher.IsActive, teacher.CreatedAt);
    }

    public async Task SetUserActiveAsync(string userId, bool isActive, CancellationToken ct = default)
    {
        EnsureAdmin();
        var user = await _users.GetByIdAsync(userId, ct)
            ?? throw new NotFoundException("User not found.");
        user.IsActive = isActive;
        user.UpdatedAt = DateTime.UtcNow;
        // Update via repository (MongoDB driver: cannot chain .Set on UpdateDefinition<T>, use Combine)
        var update = MongoDB.Driver.Builders<User>.Update.Combine(
            MongoDB.Driver.Builders<User>.Update.Set(u => u.IsActive, isActive),
            MongoDB.Driver.Builders<User>.Update.Set(u => u.UpdatedAt, user.UpdatedAt));
        await _users.UpdateAsync(userId, update, ct);
        _logger.LogInformation("Admin set user {UserId} active={Active}", userId, isActive);
    }

    /// <summary>
    /// Permanently removes a user from the system and cascades into related
    /// domain data (assignments, teacher/student links, enrollments, similarity
    /// analyses) so the database is not left with orphan documents.
    ///
    /// Safety:
    ///   - Admin users cannot be deleted (would lock out the system).
    ///   - Admins cannot delete their own account.
    ///   - All deletes are best-effort and logged; a failure in a single
    ///     cascade is surfaced as a ConflictException so the admin knows the
    ///     delete did not fully complete.
    /// </summary>
    public async Task DeleteUserAsync(string userId, CancellationToken ct = default)
    {
        EnsureAdmin();

        if (string.IsNullOrWhiteSpace(userId))
            throw new ValidationException("User id is required.");

        var user = await _users.GetByIdAsync(userId, ct)
            ?? throw new NotFoundException("User not found.");

        // Refuse to delete admin accounts. There must always be at least one
        // admin in the system, and we don't want a typo to lock everyone out.
        if (user.Role == Role.Admin)
            throw new ConflictException("Admin accounts cannot be deleted.");

        // Refuse self-delete so the current admin can't accidentally lock
        // themselves out of the panel.
        if (!string.IsNullOrEmpty(_currentUser.UserId) && _currentUser.UserId == user.Id)
            throw new ConflictException("You cannot delete your own account.");

        long enrollmentsDeleted = 0;
        long tssDeleted = 0;
        long assignmentsDeleted = 0;
        long similarityDeleted = 0;

        try
        {
            if (user.Role == Role.Student)
            {
                enrollmentsDeleted = await _enrollments.DeleteByStudentAsync(user.Id, ct);
                tssDeleted = await _teacherStudentSubjects.DeleteByStudentAsync(user.Id, ct);
                similarityDeleted = await _similarityAnalyses.DeleteByStudentAsync(user.Id, ct);
                assignmentsDeleted = await _assignments.DeleteByStudentAsync(user.Id, ct);
            }
            else if (user.Role == Role.Teacher)
            {
                tssDeleted = await _teacherStudentSubjects.DeleteByTeacherAsync(user.Id, ct);
                // Similarity analyses live on assignments — cascade via the
                // teacher's assignments first.
                similarityDeleted = await _similarityAnalyses.DeleteByTeacherAsync(user.Id, ct);
                assignmentsDeleted = await _assignments.DeleteByTeacherAsync(user.Id, ct);
            }

            var deleted = await _users.DeleteAsync(user.Id, ct);
            if (!deleted)
                throw new NotFoundException("User was already removed.");

            _logger.LogInformation(
                "Admin deleted user {UserId} ({Role}). Cascade: enrollments={Enr}, tss={Tss}, assignments={Asn}, similarity={Sim}",
                user.Id, user.Role, enrollmentsDeleted, tssDeleted, assignmentsDeleted, similarityDeleted);
        }
        catch (NotFoundException)
        {
            throw;
        }
        catch (AppException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete user {UserId} ({Role})", user.Id, user.Role);
            throw new ConflictException(
                $"Could not fully delete this user because related data could not be removed: {ex.Message}");
        }
    }

    private void EnsureAdmin()
    {
        if (_currentUser.Role != Role.Admin.ToString())
            throw new ForbiddenException("Only admin can perform this action.");
    }
}