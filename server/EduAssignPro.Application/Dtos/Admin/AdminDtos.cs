namespace EduAssignPro.Application.Dtos.Admin;

public record AdminStudentListItem(
    string Id,
    string FirstName,
    string LastName,
    string Email,
    string Role,
    string? AcademicLevelId,
    string? AcademicLevelCode,
    string? AcademicLevelName,
    bool IsActive,
    DateTime CreatedAt);

public record AdminStudentDetail(
    string Id,
    string FirstName,
    string LastName,
    string Email,
    string? PhoneNumber,
    string Role,
    string? AcademicLevelId,
    string? AcademicLevelCode,
    string? AcademicLevelName,
    bool IsActive,
    DateTime CreatedAt,
    List<AdminStudentSubjectItem> SelectedSubjects,
    List<AdminStudentSubjectItem> AvailableNotSelectedSubjects);

public record AdminStudentSubjectItem(
    string SubjectId,
    string SubjectCode,
    string SubjectName,
    bool IsCompulsory,
    string? ElectiveGroup,
    string? ElectiveOption);

public record AdminTeacherListItem(
    string Id,
    string FirstName,
    string LastName,
    string Email,
    string? PhoneNumber,
    string? AcademicLevelId,
    string? AcademicLevelName,
    bool IsActive,
    DateTime CreatedAt);

public record CreateTeacherRequest(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    string? PhoneNumber,
    string? AcademicLevelId);

public record UpdateUserStatusRequest(bool IsActive);

public record TeacherAssignmentRequest(string TeacherId, string StudentId, string SubjectId);

public record TeacherAssignmentResponse(
    string Id,
    string TeacherId,
    string TeacherName,
    string StudentId,
    string StudentName,
    string SubjectId,
    string SubjectName,
    DateTime CreatedAt,
    bool IsActive);
