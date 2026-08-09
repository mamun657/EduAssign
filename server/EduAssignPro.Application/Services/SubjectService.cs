using EduAssignPro.Application.Abstractions;
using EduAssignPro.Application.Dtos.Subjects;
using EduAssignPro.Application.Exceptions;
using EduAssignPro.Domain.Common;
using EduAssignPro.Domain.Entities;

namespace EduAssignPro.Application.Services;

public class SubjectService
{
    private readonly ISubjectRepository _subjects;
    private readonly ICurriculumSubjectRepository _curriculumSubjects;
    private readonly IAcademicLevelRepository _academicLevels;
    private readonly ICurrentUser _currentUser;

    public SubjectService(
        ISubjectRepository subjects,
        ICurriculumSubjectRepository curriculumSubjects,
        IAcademicLevelRepository academicLevels,
        ICurrentUser currentUser)
    {
        _subjects = subjects;
        _curriculumSubjects = curriculumSubjects;
        _academicLevels = academicLevels;
        _currentUser = currentUser;
    }

    public async Task<List<SubjectResponse>> ListAsync(CancellationToken ct = default)
    {
        if (!_currentUser.IsAuthenticated)
            throw new UnauthorizedException();
        var subjects = await _subjects.ListAsync(ct);
        return subjects
            .OrderBy(s => s.Name)
            .Select(s => new SubjectResponse(s.Id, s.Code, s.Name, s.IsActive))
            .ToList();
    }

    public async Task<List<CurriculumSubjectDto>> ListByAcademicLevelAsync(string academicLevelId, CancellationToken ct = default)
    {
        if (!_currentUser.IsAuthenticated)
            throw new UnauthorizedException();
        var level = await _academicLevels.GetByIdAsync(academicLevelId, ct)
            ?? throw new NotFoundException("Academic level not found.");

        var curriculum = await _curriculumSubjects.ListByAcademicLevelAsync(level.Id, ct);
        var subjectIds = curriculum.Select(c => c.SubjectId).Distinct().ToList();
        var subjectMap = new Dictionary<string, Subject>();
        foreach (var id in subjectIds)
        {
            var s = await _subjects.GetByIdAsync(id, ct);
            if (s is not null) subjectMap[s.Id] = s;
        }

        return curriculum
            .Where(c => subjectMap.ContainsKey(c.SubjectId))
            .Select(c =>
            {
                var s = subjectMap[c.SubjectId];
                return new CurriculumSubjectDto(
                    c.Id, c.AcademicLevelId, s.Id, s.Code, s.Name,
                    c.IsCompulsory, c.ElectiveGroup, c.MaxChoicesInGroup,
                    c.ElectiveOption, c.IsActive);
            })
            .OrderBy(c => c.IsCompulsory ? 0 : 1)
            .ThenBy(c => c.SubjectName)
            .ToList();
    }

    public async Task<SubjectResponse> CreateAsync(CreateSubjectRequest request, CancellationToken ct = default)
    {
        EnsureAdmin();
        if (string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.Name))
            throw new ValidationException("Code and Name are required.");
        var subject = new Subject
        {
            Code = request.Code.Trim().ToUpperInvariant(),
            Name = request.Name.Trim(),
            IsActive = true
        };
        await _subjects.UpsertByCodeAsync(subject, ct);
        var saved = await _subjects.GetByIdAsync(subject.Id, ct) ?? subject;
        return new SubjectResponse(saved.Id, saved.Code, saved.Name, saved.IsActive);
    }

    public async Task<SubjectResponse> UpdateAsync(string id, UpdateSubjectRequest request, CancellationToken ct = default)
    {
        EnsureAdmin();
        var subject = await _subjects.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Subject not found.");
        if (!string.IsNullOrWhiteSpace(request.Name)) subject.Name = request.Name.Trim();
        if (!string.IsNullOrWhiteSpace(request.Code)) subject.Code = request.Code.Trim().ToUpperInvariant();
        if (request.IsActive.HasValue) subject.IsActive = request.IsActive.Value;
        subject.UpdatedAt = DateTime.UtcNow;
        await _subjects.UpsertByCodeAsync(subject, ct);
        return new SubjectResponse(subject.Id, subject.Code, subject.Name, subject.IsActive);
    }

    public async Task DeleteAsync(string id, CancellationToken ct = default)
    {
        EnsureAdmin();
        var subject = await _subjects.GetByIdAsync(id, ct)
            ?? throw new NotFoundException("Subject not found.");
        subject.IsActive = false;
        subject.UpdatedAt = DateTime.UtcNow;
        await _subjects.UpsertByCodeAsync(subject, ct);
    }

    private void EnsureAdmin()
    {
        if (_currentUser.Role != Domain.Enums.Role.Admin.ToString())
            throw new ForbiddenException("Only admin can manage subjects.");
    }
}

public record CurriculumSubjectDto(
    string Id,
    string AcademicLevelId,
    string SubjectId,
    string SubjectCode,
    string SubjectName,
    bool IsCompulsory,
    string? ElectiveGroup,
    int? MaxChoicesInGroup,
    string? ElectiveOption,
    bool IsActive);