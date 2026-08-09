using EduAssignPro.Application.Dtos.Subjects;
using EduAssignPro.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduAssignPro.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class SubjectsController : ControllerBase
{
    private readonly SubjectService _service;

    public SubjectsController(SubjectService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<SubjectResponse>>> List(CancellationToken ct)
        => Ok(await _service.ListAsync(ct));

    [HttpGet("by-academic-level/{academicLevelId}")]
    public async Task<ActionResult<List<CurriculumSubjectDto>>> ByAcademicLevel(string academicLevelId, CancellationToken ct)
        => Ok(await _service.ListByAcademicLevelAsync(academicLevelId, ct));

    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<SubjectResponse>> Create([FromBody] CreateSubjectRequest request, CancellationToken ct)
        => Ok(await _service.CreateAsync(request, ct));

    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<ActionResult<SubjectResponse>> Update(string id, [FromBody] UpdateSubjectRequest request, CancellationToken ct)
        => Ok(await _service.UpdateAsync(id, request, ct));

    [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}