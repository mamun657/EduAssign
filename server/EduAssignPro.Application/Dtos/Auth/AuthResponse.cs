namespace EduAssignPro.Application.Dtos.Auth;

public record AuthResponse(string Token, UserResponse User);

public record UserResponse(
    string Id,
    string FirstName,
    string LastName,
    string Email,
    string? PhoneNumber,
    string Role,
    string? AcademicLevelId,
    bool IsActive,
    DateTime CreatedAt);
