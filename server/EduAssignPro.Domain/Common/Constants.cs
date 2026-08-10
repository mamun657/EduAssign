namespace EduAssignPro.Domain.Common;

public static class Constants
{
    // Collections
    public const string UsersCollection = "Users";
    public const string AcademicLevelsCollection = "AcademicLevels";
    public const string SubjectsCollection = "Subjects";
    public const string CurriculumSubjectsCollection = "CurriculumSubjects";
    public const string StudentSubjectEnrollmentsCollection = "StudentSubjectEnrollments";
    public const string TeacherStudentSubjectsCollection = "TeacherStudentSubjects";
    public const string AssignmentsCollection = "Assignments";
    public const string SimilarityAnalysesCollection = "SimilarityAnalyses";

    // Roles
    public const string RoleAdmin = "Admin";
    public const string RoleTeacher = "Teacher";
    public const string RoleStudent = "Student";

    // Similarity thresholds (defaults; runtime values come from configuration)
    public const double DefaultLexicalWeight = 0.40;
    public const double DefaultSemanticWeight = 0.60;
    public const double DefaultLowThreshold = 30.0;
    public const double DefaultModerateThreshold = 70.0;
    public const int DefaultTopMatches = 5;
    public const double DefaultMinCompareScore = 1.0;

    // Academic levels
    public const string SchoolCode = "SCHOOL";
    public const string CollegeCode = "COLLEGE";

    // Elective groups
    public const string ScienceOptionalGroup = "ScienceOptional";
}