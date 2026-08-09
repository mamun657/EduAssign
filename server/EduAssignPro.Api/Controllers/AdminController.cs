using EduAssignPro.Application.Dtos.Admin;
using EduAssignPro.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduAssignPro.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AdminService _service;

    public AdminController(AdminService service)
    {
        _service = service;
    }

    [HttpGet("students")]
    public async Task<ActionResult<List<AdminStudentListItem>>> ListStudents(CancellationToken ct)
        => Ok(await _service.ListStudentsAsync(ct));

    [HttpGet("students/{id}")]
    public async Task<ActionResult<AdminStudentDetail>> StudentDetail(string id, CancellationToken ct)
        => Ok(await _service.GetStudentDetailAsync(id, ct));

    [HttpGet("teachers")]
    public async Task<ActionResult<List<AdminTeacherListItem>>> ListTeachers(CancellationToken ct)
        => Ok(await _service.ListTeachersAsync(ct));

    [HttpPost("teachers")]
    public async Task<ActionResult<AdminTeacherListItem>> CreateTeacher([FromBody] CreateTeacherRequest request, CancellationToken ct)
        => Ok(await _service.CreateTeacherAsync(request, ct));

    [HttpPatch("users/{id}/active")]
    public async Task<IActionResult> SetActive(string id, [FromBody] UpdateUserStatusRequest request, CancellationToken ct)
    {
        await _service.SetUserActiveAsync(id, request.IsActive, ct);
        return NoContent();
    }
}