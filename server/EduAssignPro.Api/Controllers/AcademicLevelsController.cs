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

    [AllowAnonymous]
    [HttpGet]
    public async Task<ActionResult<List<AcademicLevelResponse>>> List(CancellationToken ct)
    {
        var result = await _service.ListAsync(ct);
        return Ok(result);
    }
}