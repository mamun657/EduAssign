namespace EduAssignPro.Application.Abstractions;

public interface ICurrentUser
{
    string? UserId { get; }
    string? Email { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
}
