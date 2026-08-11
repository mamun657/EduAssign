using Microsoft.AspNetCore.Mvc;

namespace EduAssignPro.Api.Controllers;

/// <summary>
/// Liveness probe used by Render's health check (and any external uptime monitor).
/// Kept intentionally simple — no auth, no DB touch, no logging — so a 200 here
/// means the process is up and the routing pipeline is healthy.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet("ping")]
    public IActionResult Ping() => Ok(new { status = "ok", utc = DateTime.UtcNow });
}
