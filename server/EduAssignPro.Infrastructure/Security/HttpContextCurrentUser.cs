using System.Security.Claims;
using EduAssignPro.Application.Abstractions;
using Microsoft.AspNetCore.Http;

namespace EduAssignPro.Infrastructure.Security;

public class HttpContextCurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _accessor;

    public HttpContextCurrentUser(IHttpContextAccessor accessor)
    {
        _accessor = accessor;
    }

    private ClaimsPrincipal? Principal => _accessor.HttpContext?.User;

    public string? UserId => Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? Principal?.FindFirst("sub")?.Value;

    public string? Email => Principal?.FindFirst(ClaimTypes.Email)?.Value
        ?? Principal?.FindFirst("email")?.Value;

    public string? Role
    {
        get
        {
            var principal = Principal;
            if (principal is null) return null;
            var role = principal.FindFirst(ClaimTypes.Role)?.Value;
            if (!string.IsNullOrEmpty(role)) return role;
            if (principal.IsInRole("Admin")) return "Admin";
            if (principal.IsInRole("Teacher")) return "Teacher";
            if (principal.IsInRole("Student")) return "Student";
            return null;
        }
    }

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;
}
