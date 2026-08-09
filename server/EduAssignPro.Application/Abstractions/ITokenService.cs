namespace EduAssignPro.Application.Abstractions;

public interface ITokenService
{
    string CreateToken(string userId, string email, string role, TimeSpan? lifetime = null);
    (string userId, string email, string role)? ValidateToken(string token);
}
