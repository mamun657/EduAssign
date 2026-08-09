namespace EduAssignPro.Application.Dtos.Students;

public record CurriculumSubjectResponse(
    string CurriculumSubjectId,
    string SubjectId,
    string SubjectCode,
    string SubjectName,
    bool IsCompulsory,
    string? ElectiveGroup,
    int? MaxChoicesInGroup,
    string? ElectiveOption);

public record ElectiveOptionResponse(
    string Key,
    string DisplayName,
    List<CurriculumSubjectResponse> Subjects);

public record AvailableCurriculumResponse(
    string AcademicLevelId,
    string AcademicLevelCode,
    string AcademicLevelName,
    List<CurriculumSubjectResponse> CompulsorySubjects,
    List<ElectiveGroupResponse> ElectiveGroups,
    List<CurriculumSubjectResponse> AlreadyEnrolled);

/// <summary>
/// Mutable container so the StudentService can append Options after construction
/// when walking the curriculum. Serialized as JSON to the frontend unchanged.
/// </summary>
public class ElectiveGroupResponse
{
    public string Name { get; set; } = string.Empty;
    public int MaxChoicesInGroup { get; set; }
    public List<CurriculumSubjectResponse> Subjects { get; set; } = new();
    public List<ElectiveOptionResponse> Options { get; set; } = new();

    public ElectiveGroupResponse() { }

    public ElectiveGroupResponse(
        string name,
        int maxChoicesInGroup,
        List<CurriculumSubjectResponse> subjects,
        List<ElectiveOptionResponse> options)
    {
        Name = name;
        MaxChoicesInGroup = maxChoicesInGroup;
        Subjects = subjects;
        Options = options;
    }
}

public record StudentSubjectResponse(
    string SubjectId,
    string SubjectCode,
    string SubjectName,
    bool IsCompulsory,
    string? ElectiveGroup,
    string? ElectiveOption,
    DateTime EnrolledAt);

public record EnrollSubjectRequest(string SubjectId);

public record EnrollSubjectResponse(
    string SubjectId,
    string SubjectCode,
    string SubjectName,
    bool IsCompulsory,
    string? ElectiveGroup,
    string? ElectiveOption);
