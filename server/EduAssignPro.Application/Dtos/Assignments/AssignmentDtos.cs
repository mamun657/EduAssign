namespace EduAssignPro.Application.Dtos.Assignments;

public record CreateAssignmentRequest(
    string StudentId,
    string SubjectId,
    string Title,
    string? Description,
    DateTime DueDate);

public record UpdateAssignmentRequest(
    string? Title,
    string? Description,
    DateTime? DueDate);

public record SubmitAssignmentRequest(string SubmissionText);

public record ReviewSubmissionRequest(decimal Marks, string? Feedback);

public record AssignmentResponse(
    string Id,
    string TeacherId,
    string TeacherName,
    string StudentId,
    string StudentName,
    string SubjectId,
    string SubjectName,
    string Title,
    string? Description,
    DateTime DueDate,
    bool IsPublished,
    bool IsActive,
    string? SubmissionText,
    DateTime? SubmittedAt,
    decimal? Marks,
    string? Feedback,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt);
