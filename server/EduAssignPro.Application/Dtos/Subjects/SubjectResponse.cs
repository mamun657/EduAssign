namespace EduAssignPro.Application.Dtos.Subjects;

public record SubjectResponse(string Id, string Code, string Name, bool IsActive);

public record CreateSubjectRequest(string Code, string Name);

public record UpdateSubjectRequest(string? Code, string? Name, bool? IsActive);
