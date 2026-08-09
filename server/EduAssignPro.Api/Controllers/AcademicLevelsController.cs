using EduAssignPro.Application.Dtos.AcademicLevels;
using EduAssignPro.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduAssignPro.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class AcademicLevelsController : ControllerBase
{
    private readonly AcademicLevelService _service;

    public AcademicLevelsController(AcademicLevelService service)
    {
        _service = service;
    }

    // Academic levels (School / College) are configuration metadata, not
    // sensitive data. The public registration page needs to load them so a
    // prospective student can pick one. All other endpoints on this
    // controller remain authorized via the [Authorize] attribute on the class.
    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<List<AcademicLevelResponse>>> List(CancellationToken ct)
    {
        var result = await _service.ListAsync(ct);
        return Ok(result);
    }
}