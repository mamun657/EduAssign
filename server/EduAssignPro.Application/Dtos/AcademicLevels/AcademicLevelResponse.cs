namespace EduAssignPro.Application.Dtos.AcademicLevels;

public record AcademicLevelResponse(string Id, string Code, string Name, string? Description, bool IsActive);
