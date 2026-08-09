using EduAssignPro.Application.Dtos.Students;
using EduAssignPro.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduAssignPro.Api.Controllers;

[ApiController]
[Authorize(Roles = "Student")]
[Route("api/[controller]")]
public class StudentsController : ControllerBase
{
    private readonly StudentService _service;

    public StudentsController(StudentService service)
    {
        _service = service;
    }

    [HttpGet("available-subjects")]
    public async Task<ActionResult<AvailableCurriculumResponse>> Available(CancellationToken ct)
        => Ok(await _service.GetAvailableSubjectsAsync(ct));

    [HttpGet("enrolled-subjects")]
    public async Task<ActionResult<List<StudentSubjectResponse>>> Enrolled(CancellationToken ct)
        => Ok(await _service.GetMyEnrolledSubjectsAsync(ct));

    [HttpPost("enroll")]
    public async Task<ActionResult<EnrollSubjectResponse>> Enroll([FromBody] EnrollSubjectRequest request, CancellationToken ct)
        => Ok(await _service.EnrollSubjectAsync(request, ct));

    [HttpDelete("enroll/{subjectId}")]
    public async Task<IActionResult> Unenroll(string subjectId, CancellationToken ct)
    {
        await _service.RemoveEnrolledSubjectAsync(subjectId, ct);
        return NoContent();
    }
}