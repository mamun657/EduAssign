using EduAssignPro.Application.Services;
using EduAssignPro.Application.Dtos.Similarity;
using EduAssignPro.Application.Abstractions;
using EduAssignPro.Application.Exceptions;
using EduAssignPro.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduAssignPro.Api.Controllers;

/// <summary>
/// Phase 6: AI similarity / plagiarism detection endpoints.
/// </summary>
[ApiController]
[Authorize]
[Route("api/similarity")]
public class SimilarityController : ControllerBase
{
    private readonly SimilarityAnalysisService _service;
    private readonly SimilarityAnalysisBackgroundQueue _queue;
    private readonly ICurrentUser _currentUser;
    private readonly IAssignmentRepository _assignments;
    private readonly ILogger<SimilarityController> _logger;

    public SimilarityController(
        SimilarityAnalysisService service,
        SimilarityAnalysisBackgroundQueue queue,
        ICurrentUser currentUser,
        IAssignmentRepository assignments,
        ILogger<SimilarityController> logger)
    {
        _service = service;
        _queue = queue;
        _currentUser = currentUser;
        _assignments = assignments;
        _logger = logger;
    }

    /// <summary>
    /// Trigger analysis for one submission (a.k.a. assignment). Teacher or admin only.
    /// </summary>
    [HttpPost("submissions/{submissionId}/analyze")]
    public async Task<IActionResult> Analyze([FromRoute] string submissionId, CancellationToken ct)
    {
        var role = _currentUser.Role;
        if (role != Role.Teacher.ToString() && role != Role.Admin.ToString())
            return Forbid();

        var assignment = await _assignments.GetByIdAsync(submissionId, ct);
        if (assignment is null) return NotFound(new { error = "Submission not found." });
        if (role == Role.Teacher.ToString() && assignment.TeacherId != _currentUser.UserId)
            return Forbid();

        var rec = await _service.StartAnalysisAsync(assignment.Id, assignment.Id, assignment.StudentId, ct);
        _queue.TryEnqueue(submissionId);
        return Accepted(new { id = rec.Id, submissionId, status = rec.Status.ToString() });
    }

    /// <summary>
    /// Per-assignment summary, teacher/admin only. Returns all submissions ranked by similarity.
    /// </summary>
    [HttpGet("assignments/{assignmentId}/summary")]
    public async Task<IActionResult> AssignmentSummary([FromRoute] string assignmentId, CancellationToken ct)
    {
        var role = _currentUser.Role;
        if (role != Role.Teacher.ToString() && role != Role.Admin.ToString())
            return Forbid();
        try
        {
            var dto = await _service.GetAssignmentSummaryAsync(assignmentId, ct);
            return Ok(dto);
        }
        catch (NotFoundException)
        {
            return NotFound(new { error = "Assignment not found." });
        }
    }

    /// <summary>
    /// Per-submission summary.
    ///   - Teacher/admin: full payload with matches.
    ///   - Student (must be the owner): payload WITHOUT other students' matches.
    /// </summary>
    [HttpGet("submissions/{submissionId}")]
    public async Task<IActionResult> SubmissionSummary([FromRoute] string submissionId, CancellationToken ct)
    {
        var role = _currentUser.Role;
        if (role == Role.Teacher.ToString() || role == Role.Admin.ToString())
        {
            var dto = await _service.GetForSubmissionAsync(submissionId, ct);
            return dto is null ? NotFound(new { error = "Similarity analysis not found. Run /analyze first." }) : Ok(dto);
        }
        if (role == Role.Student.ToString())
        {
            var assignment = await _assignments.GetByIdAsync(submissionId, ct);
            if (assignment is null) return NotFound(new { error = "Submission not found." });
            if (assignment.StudentId != _currentUser.UserId) return Forbid();
            var dto = await _service.GetForOwnSubmissionAsync(submissionId, ct);
            return dto is null
                ? Ok(new SimilaritySummaryDto
                {
                    SubmissionId = submissionId,
                    AssignmentId = assignment.Id,
                    StudentId = assignment.StudentId,
                    Status = "NotAnalyzed",
                    Level = "Unknown"
                })
                : Ok(dto);
        }
        return Forbid();
    }

    /// <summary>
    /// Pairwise comparison view (teacher/admin only).
    /// </summary>
    [HttpGet("compare")]
    public async Task<IActionResult> Compare([FromQuery] string a, [FromQuery] string b, CancellationToken ct)
    {
        var role = _currentUser.Role;
        if (role != Role.Teacher.ToString() && role != Role.Admin.ToString())
            return Forbid();
        if (string.IsNullOrWhiteSpace(a) || string.IsNullOrWhiteSpace(b))
            return BadRequest(new { error = "Both 'a' and 'b' query params (submission ids) are required." });
        try
        {
            var dto = await _service.CompareAsync(a, b, ct);
            return Ok(dto);
        }
        catch (ValidationException vx) { return BadRequest(new { error = vx.Message }); }
        catch (NotFoundException nx) { return NotFound(new { error = nx.Message }); }
        catch (ForbiddenException) { return Forbid(); }
    }
}
