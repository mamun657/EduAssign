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

    // Phase 4: file size cap mirrored on the controller (defence-in-depth).
    private const long MaxFileBytes = 10 * 1024 * 1024; // 10 MB

    public AssignmentsController(AssignmentService service)
    {
        _service = service;
    }

    [Authorize(Roles = "Teacher")]
    [HttpPost]
    public async Task<ActionResult<AssignmentResponse>> Create(
        [FromBody] CreateAssignmentRequest request, CancellationToken ct)
        => Ok(await _service.CreateAsync(request, ct));

    [HttpGet]
    public async Task<ActionResult<List<AssignmentResponse>>> List(CancellationToken ct)
        => Ok(await _service.ListAsync(ct));

    [HttpGet("{id}")]
    public async Task<ActionResult<AssignmentResponse>> Get(string id, CancellationToken ct)
        => Ok(await _service.GetByIdAsync(id, ct));

    [Authorize(Roles = "Teacher")]
    [HttpPut("{id}")]
    public async Task<ActionResult<AssignmentResponse>> Update(
        string id, [FromBody] UpdateAssignmentRequest request, CancellationToken ct)
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
    public async Task<ActionResult<AssignmentResponse>> Submit(
        string id, [FromBody] SubmitAssignmentRequest request, CancellationToken ct)
        => Ok(await _service.SubmitAsync(id, request, ct));

    [Authorize(Roles = "Teacher")]
    [HttpPost("{id}/review")]
    public async Task<ActionResult<AssignmentResponse>> Review(
        string id, [FromBody] ReviewSubmissionRequest request, CancellationToken ct)
        => Ok(await _service.ReviewAsync(id, request, ct));

    // ---- Phase 4: file attachment endpoints ----

    [Authorize(Roles = "Teacher")]
    [HttpPost("{id}/attachment")]
    [RequestSizeLimit(MaxFileBytes)]
    public async Task<ActionResult<StoredFileResponse>> UploadAttachment(
        string id, IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });
        if (file.Length > MaxFileBytes)
            return BadRequest(new { message = $"File too large. Max size is {MaxFileBytes / (1024 * 1024)} MB." });

        await using var stream = file.OpenReadStream();
        var result = await _service.UploadAttachmentAsync(id, stream, file.FileName, file.ContentType ?? "application/octet-stream", ct);
        return Ok(result);
    }

    [HttpGet("{id}/attachment")]
    public async Task<IActionResult> DownloadAttachment(string id, CancellationToken ct)
    {
        var stored = await _service.GetAttachmentAsync(id, ct);
        return File(stored.OpenReadStream(), stored.ContentType, stored.FileName);
    }

    [Authorize(Roles = "Student")]
    [HttpPost("{id}/submission-file")]
    [RequestSizeLimit(MaxFileBytes)]
    public async Task<ActionResult<StoredFileResponse>> UploadSubmissionFile(
        string id, IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });
        if (file.Length > MaxFileBytes)
            return BadRequest(new { message = $"File too large. Max size is {MaxFileBytes / (1024 * 1024)} MB." });

        await using var stream = file.OpenReadStream();
        var result = await _service.UploadSubmissionFileAsync(id, stream, file.FileName, file.ContentType ?? "application/octet-stream", ct);
        return Ok(result);
    }

    [Authorize(Roles = "Teacher")]
    [HttpGet("{id}/submission-file")]
    public async Task<IActionResult> DownloadSubmissionFile(string id, CancellationToken ct)
    {
        var stored = await _service.GetSubmissionFileAsync(id, ct);
        return File(stored.OpenReadStream(), stored.ContentType, stored.FileName);
    }
}
