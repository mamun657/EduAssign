using EduAssignPro.Application.Abstractions;
using EduAssignPro.Application.Dtos.Students;
using EduAssignPro.Application.Exceptions;
using EduAssignPro.Domain.Common;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Domain.Enums;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;

namespace EduAssignPro.Application.Services;

public class StudentService
{
    private readonly IUserRepository _users;
    private readonly IAcademicLevelRepository _academicLevels;
    private readonly ICurriculumSubjectRepository _curriculumSubjects;
    private readonly ISubjectRepository _subjects;
    private readonly IStudentEnrollmentRepository _enrollments;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<StudentService> _logger;

    public StudentService(
        IUserRepository users,
        IAcademicLevelRepository academicLevels,
        ICurriculumSubjectRepository curriculumSubjects,
        ISubjectRepository subjects,
        IStudentEnrollmentRepository enrollments,
        ICurrentUser currentUser,
        ILogger<StudentService> logger)
    {
        _users = users;
        _academicLevels = academicLevels;
        _curriculumSubjects = curriculumSubjects;
        _subjects = subjects;
        _enrollments = enrollments;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<AvailableCurriculumResponse> GetAvailableSubjectsAsync(CancellationToken ct = default)
    {
        var student = await GetCurrentStudentAsync(ct);
        if (string.IsNullOrEmpty(student.AcademicLevelId))
            throw new ValidationException("Student has not selected an academic level.");

        var level = await _academicLevels.GetByIdAsync(student.AcademicLevelId, ct)
            ?? throw new NotFoundException("Academic level not found.");

        var curriculum = await _curriculumSubjects.ListByAcademicLevelAsync(level.Id, ct);
        var subjectIds = curriculum.Select(c => c.SubjectId).Distinct().ToList();
        var subjects = await GetSubjectsAsync(subjectIds, ct);
        var subjectMap = subjects.ToDictionary(s => s.Id);

        var enrollments = await _enrollments.ListByStudentAsync(student.Id, ct);
        var enrolledSubjectIds = enrollments.Select(e => e.SubjectId).ToHashSet();

        var compulsory = new List<CurriculumSubjectResponse>();
        var electiveGroups = new Dictionary<string, ElectiveGroupResponse>();
        var alreadyEnrolled = new List<CurriculumSubjectResponse>();

        foreach (var cs in curriculum)
        {
            if (!subjectMap.TryGetValue(cs.SubjectId, out var subject))
                continue;

            var item = new CurriculumSubjectResponse(
                cs.Id, subject.Id, subject.Code, subject.Name,
                cs.IsCompulsory, cs.ElectiveGroup, cs.MaxChoicesInGroup,
                cs.ElectiveOption);

            if (cs.IsCompulsory)
            {
                compulsory.Add(item);
            }
            else
            {
                var groupName = cs.ElectiveGroup ?? "Other";
                if (!electiveGroups.TryGetValue(groupName, out var group))
                {
                    group = new ElectiveGroupResponse(
                        groupName,
                        cs.MaxChoicesInGroup ?? 1,
                        new List<CurriculumSubjectResponse>(),
                        new List<ElectiveOptionResponse>());
                    electiveGroups[groupName] = group;
                }
                group.Subjects.Add(item);

                if (!string.IsNullOrWhiteSpace(cs.ElectiveOption))
                {
                    var optionKey = cs.ElectiveOption!;
                    var existingOption = group.Options.FirstOrDefault(o => o.Key == optionKey);
                    if (existingOption is null)
                    {
                        existingOption = new ElectiveOptionResponse(
                            optionKey,
                            OptionDisplayName(optionKey),
                            new List<CurriculumSubjectResponse>());
                        group.Options.Add(existingOption);
                    }
                    existingOption.Subjects.Add(item);
                }
            }

            if (enrolledSubjectIds.Contains(subject.Id))
                alreadyEnrolled.Add(item);
        }

        foreach (var g in electiveGroups.Values)
        {
            g.Options = g.Options
                .OrderBy(o => o.Key, StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        return new AvailableCurriculumResponse(
            level.Id, level.Code, level.Name,
            compulsory,
            electiveGroups.Values.ToList(),
            alreadyEnrolled);
    }

    /// <summary>
    /// Returns a human-friendly display name for a known elective option key.
    /// Falls back to splitting CamelCase keys for forward compatibility.
    /// </summary>
    private static string OptionDisplayName(string optionKey)
    {
        return optionKey switch
        {
            "Biology" => "Biology",
            "HigherMathematics" => "Higher Mathematics",
            _ => System.Text.RegularExpressions.Regex.Replace(optionKey, "([a-z])([A-Z])", "$1 $2")
        };
    }

    public async Task<List<StudentSubjectResponse>> GetMyEnrolledSubjectsAsync(CancellationToken ct = default)
    {
        var student = await GetCurrentStudentAsync(ct);
        var enrollments = await _enrollments.ListByStudentAsync(student.Id, ct);
        if (enrollments.Count == 0)
            return new List<StudentSubjectResponse>();

        var subjectIds = enrollments.Select(e => e.SubjectId).ToList();
        var subjects = await GetSubjectsAsync(subjectIds, ct);
        var subjectMap = subjects.ToDictionary(s => s.Id);

        var results = new List<StudentSubjectResponse>();
        foreach (var e in enrollments)
        {
            if (!subjectMap.TryGetValue(e.SubjectId, out var subject))
                continue;
            var cs = await _curriculumSubjects.GetByIdAsync(e.CurriculumSubjectId, ct);
            results.Add(new StudentSubjectResponse(
                subject.Id, subject.Code, subject.Name,
                cs?.IsCompulsory ?? false, cs?.ElectiveGroup, cs?.ElectiveOption,
                e.EnrolledAt));
        }
        return results;
    }

    public async Task<EnrollSubjectResponse> EnrollSubjectAsync(EnrollSubjectRequest request, CancellationToken ct = default)
    {
        var student = await GetCurrentStudentAsync(ct);
        if (string.IsNullOrEmpty(student.AcademicLevelId))
            throw new ValidationException("Student has not selected an academic level.");

        var subject = await _subjects.GetByIdAsync(request.SubjectId, ct)
            ?? throw new NotFoundException("Subject not found.");
        if (!subject.IsActive)
            throw new ValidationException("Subject is not active.");

        var cs = await _curriculumSubjects.FindByAcademicLevelAndSubjectAsync(student.AcademicLevelId, subject.Id, ct)
            ?? throw new ValidationException("This subject does not belong to your academic level curriculum.");

        if (!cs.IsActive)
            throw new ValidationException("This curriculum subject is not active.");

        if (cs.IsCompulsory)
            throw new ValidationException("Compulsory subjects are automatically enrolled. They cannot be added manually.");

        var existing = await _enrollments.GetAsync(student.Id, subject.Id, ct);
        if (existing is not null)
            throw new ConflictException("You are already enrolled in this subject.");

        var groupName = cs.ElectiveGroup;

        var enrollments = await _enrollments.ListByStudentAsync(student.Id, ct);

        foreach (var e in enrollments)
        {
            var existingCs = await _curriculumSubjects.GetByIdAsync(e.CurriculumSubjectId, ct);
            if (existingCs is null) continue;
            if (existingCs.IsCompulsory) continue;
            if (existingCs.ElectiveGroup != groupName) continue;

            // we reject cross-option mixing here. The single-option (legacy) case
            // (ElectiveOption == null) keeps the original "only one from this
            // group" behavior.
            if (!string.IsNullOrWhiteSpace(cs.ElectiveOption) ||
                !string.IsNullOrWhiteSpace(existingCs.ElectiveOption))
            {
                var newOpt = cs.ElectiveOption ?? "";
                var existingOpt = existingCs.ElectiveOption ?? "";
                if (!string.Equals(newOpt, existingOpt, StringComparison.OrdinalIgnoreCase))
                {
                    var other = await _subjects.GetByIdAsync(e.SubjectId, ct);
                    var otherOptionLabel = string.IsNullOrWhiteSpace(existingOpt)
                        ? "another subject"
                        : $"{OptionDisplayName(existingOpt)} ({other?.Name ?? "another subject"})";
                    var requestedOptionLabel = string.IsNullOrWhiteSpace(newOpt)
                        ? "another subject"
                        : OptionDisplayName(newOpt);
                    throw new ValidationException(
                        $"You have already selected '{otherOptionLabel}' from this elective group. " +
                        $"You cannot combine '{requestedOptionLabel}' with it. Choose only one option.");
                }
            }
            else
            {
                var other = await _subjects.GetByIdAsync(e.SubjectId, ct);
                throw new ValidationException(
                    $"You have already selected '{other?.Name ?? "another subject"}' from this elective group. You can only choose one.");
            }
        }

        var enrollment = new StudentSubjectEnrollment
        {
            StudentId = student.Id,
            SubjectId = subject.Id,
            CurriculumSubjectId = cs.Id,
            EnrolledAt = DateTime.UtcNow,
            IsActive = true
        };
        await _enrollments.InsertAsync(enrollment, ct);
        _logger.LogInformation("Student {StudentId} enrolled in subject {SubjectId}", student.Id, subject.Id);

        // Auto-enroll all sibling papers sharing the same (ElectiveGroup, ElectiveOption).
        if (!string.IsNullOrWhiteSpace(cs.ElectiveOption))
        {
            var allInGroup = (await _curriculumSubjects.ListByAcademicLevelAsync(student.AcademicLevelId, ct))
                .Where(c => !c.IsCompulsory
                    && c.IsActive
                    && c.ElectiveGroup == groupName
                    && !string.IsNullOrWhiteSpace(c.ElectiveOption))
                .ToList();
            var siblings = allInGroup
                .Where(c => string.Equals(c.ElectiveOption, cs.ElectiveOption, StringComparison.OrdinalIgnoreCase)
                    && c.Id != cs.Id
                    && c.SubjectId != subject.Id)
                .ToList();

            foreach (var sibCs in siblings)
            {
                var already = await _enrollments.GetAsync(student.Id, sibCs.SubjectId, ct);
                if (already is not null) continue;
                await _enrollments.InsertAsync(new StudentSubjectEnrollment
                {
                    StudentId = student.Id,
                    SubjectId = sibCs.SubjectId,
                    CurriculumSubjectId = sibCs.Id,
                    EnrolledAt = DateTime.UtcNow,
                    IsActive = true
                }, ct);
                _logger.LogInformation("Student {StudentId} auto-enrolled in sibling subject {SubjectId} (option {Option})",
                    student.Id, sibCs.SubjectId, sibCs.ElectiveOption);
            }
        }

        return new EnrollSubjectResponse(subject.Id, subject.Code, subject.Name,
            cs.IsCompulsory, cs.ElectiveGroup, cs.ElectiveOption);
    }

    public async Task RemoveEnrolledSubjectAsync(string subjectId, CancellationToken ct = default)
    {
        var student = await GetCurrentStudentAsync(ct);
        var enrollment = await _enrollments.GetAsync(student.Id, subjectId, ct)
            ?? throw new NotFoundException("You are not enrolled in this subject.");

        var cs = await _curriculumSubjects.GetByIdAsync(enrollment.CurriculumSubjectId, ct);
        if (cs is { IsCompulsory: true })
            throw new ValidationException("Compulsory subjects cannot be removed.");

        var deleted = await _enrollments.DeleteAsync(student.Id, subjectId, ct);
        if (!deleted)
            throw new NotFoundException("Enrollment not found.");
        _logger.LogInformation("Student {StudentId} unenrolled from subject {SubjectId}", student.Id, subjectId);
    }

    private async Task<User> GetCurrentStudentAsync(CancellationToken ct)
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrEmpty(_currentUser.UserId))
            throw new UnauthorizedException();
        var user = await _users.GetByIdAsync(_currentUser.UserId, ct)
            ?? throw new NotFoundException("User not found.");
        if (user.Role != Role.Student)
            throw new ForbiddenException("Only students can perform this action.");
        return user;
    }

    private async Task<List<Subject>> GetSubjectsAsync(IEnumerable<string> ids, CancellationToken ct)
    {
        var list = new List<Subject>();
        foreach (var id in ids)
        {
            var s = await _subjects.GetByIdAsync(id, ct);
            if (s is not null) list.Add(s);
        }
        return list;
    }
}