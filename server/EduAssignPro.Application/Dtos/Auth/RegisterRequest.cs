namespace EduAssignPro.Application.Dtos.Auth;

public record RegisterRequest(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    string ConfirmPassword,
    string? PhoneNumber,
    string Role,
    string? AcademicLevelId);
