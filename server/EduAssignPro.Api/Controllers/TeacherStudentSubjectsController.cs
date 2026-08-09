using EduAssignPro.Application.Dtos.Admin;
using EduAssignPro.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduAssignPro.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/teacher-student-subjects")]
public class TeacherStudentSubjectsController : ControllerBase
{
    private readonly TeacherStudentSubjectService _service;

    public TeacherStudentSubjectsController(TeacherStudentSubjectService service)
    {
        _service = service;
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<ActionResult<List<TeacherAssignmentResponse>>> List(CancellationToken ct)
        => Ok(await _service.ListAsync(ct));

    [Authorize(Roles = "Teacher")]
    [HttpGet("mine")]
    public async Task<ActionResult<List<TeacherAssignmentResponse>>> Mine(CancellationToken ct)
        => Ok(await _service.ListForTeacherAsync(ct));

    [Authorize(Roles = "Student")]
    [HttpGet("my-teachers")]
    public async Task<ActionResult<List<TeacherAssignmentResponse>>> MyTeachers(CancellationToken ct)
        => Ok(await _service.ListForStudentAsync(ct));

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<TeacherAssignmentResponse>> Assign([FromBody] TeacherAssignmentRequest request, CancellationToken ct)
        => Ok(await _service.AssignAsync(request, ct));

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }
}