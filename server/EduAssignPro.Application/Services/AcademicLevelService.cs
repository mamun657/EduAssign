using EduAssignPro.Application.Abstractions;
using EduAssignPro.Application.Dtos.AcademicLevels;
using EduAssignPro.Application.Exceptions;

namespace EduAssignPro.Application.Services;

public class AcademicLevelService
{
    private readonly IAcademicLevelRepository _academicLevels;
    private readonly ICurrentUser _currentUser;

    public AcademicLevelService(IAcademicLevelRepository academicLevels, ICurrentUser currentUser)
    {
        _academicLevels = academicLevels;
        _currentUser = currentUser;
    }

    public async Task<List<AcademicLevelResponse>> ListAsync(CancellationToken ct = default)
    {
        // Academic levels are public configuration metadata (School / College).
        // The registration page needs to enumerate them without a token, so
        // authentication is intentionally not required here. Authorization is
        // enforced at the controller boundary (see AcademicLevelsController).
        var levels = await _academicLevels.ListAsync(ct);
        return levels
            .OrderBy(l => l.Code)
            .Select(l => new AcademicLevelResponse(l.Id, l.Code, l.Name, l.Description, l.IsActive))
            .ToList();
    }
}