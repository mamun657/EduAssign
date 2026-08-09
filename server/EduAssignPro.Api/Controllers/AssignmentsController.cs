using EduAssignPro.Application.Dtos.Assignments;
using EduAssignPro.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduAssignPro.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/assignments")]
public class AssignmentsController : ControllerBase
{
    private readonly AssignmentService _service;

    public AssignmentsController(AssignmentService service)
    {
        _service = service;
    }

    [Authorize(Roles = "Teacher")]
    [HttpPost]
    public async Task<ActionResult<AssignmentResponse>> Create([FromBody] CreateAssignmentRequest request, CancellationToken ct)
        => Ok(await _service.CreateAsync(request, ct));

    [HttpGet]
    public async Task<ActionResult<List<AssignmentResponse>>> List(CancellationToken ct)
        => Ok(await _service.ListAsync(ct));

    [HttpGet("{id}")]
    public async Task<ActionResult<AssignmentResponse>> Get(string id, CancellationToken ct)
        => Ok(await _service.GetByIdAsync(id, ct));

    [Authorize(Roles = "Teacher")]
    [HttpPut("{id}")]
    public async Task<ActionResult<AssignmentResponse>> Update(string id, [FromBody] UpdateAssignmentRequest request, CancellationToken ct)
        => Ok(await _service.UpdateAsync(id, request, ct));

    [Authorize(Roles = "Teacher")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }

    [Authorize(Roles = "Teacher")]
    [HttpPost("{id}/publish")]
    public async Task<ActionResult<AssignmentResponse>> Publish(string id, CancellationToken ct)
        => Ok(await _service.PublishAsync(id, ct));

    [Authorize(Roles = "Student")]
    [HttpPost("{id}/submit")]
    public async Task<ActionResult<AssignmentResponse>> Submit(string id, [FromBody] SubmitAssignmentRequest request, CancellationToken ct)
        => Ok(await _service.SubmitAsync(id, request, ct));

    [Authorize(Roles = "Teacher")]
    [HttpPost("{id}/review")]
    public async Task<ActionResult<AssignmentResponse>> Review(string id, [FromBody] ReviewSubmissionRequest request, CancellationToken ct)
        => Ok(await _service.ReviewAsync(id, request, ct));
}