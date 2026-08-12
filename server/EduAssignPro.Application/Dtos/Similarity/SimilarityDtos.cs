namespace EduAssignPro.Application.Dtos.Similarity;

/// <summary>Lightweight per-submission summary surfaced to teacher and (limited) student views.</summary>
public class SimilaritySummaryDto
{
    public string SubmissionId { get; set; } = string.Empty;
    public string AssignmentId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string Status { get; set; } = "NotAnalyzed";
    public double? OverallScore { get; set; }
    public double? HighestSimilarityScore { get; set; }
    public double? LexicalScore { get; set; }
    public double? SemanticScore { get; set; }
    public string? ComparedSubmissionId { get; set; }
    public string? ComparedStudentId { get; set; }
    public string? ComparedStudentName { get; set; }
    public string Level { get; set; } = "Unknown";   
    public DateTime? AnalyzedAt { get; set; }
    public string? ErrorMessage { get; set; }
    public List<SimilarityMatchDto> Matches { get; set; } = new();
}

/// <summary>Single ranked match.</summary>
public class SimilarityMatchDto
{
    public string SubmissionId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public double LexicalScore { get; set; }
    public double SemanticScore { get; set; }
    public double FinalScore { get; set; }
}

/// <summary>Per-submission detailed comparison view (teacher only).</summary>
public class SimilarityComparisonDto
{
    public string SubmissionId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string OtherSubmissionId { get; set; } = string.Empty;
    public string OtherStudentId { get; set; } = string.Empty;
    public string OtherStudentName { get; set; } = string.Empty;
    public double LexicalScore { get; set; }
    public double SemanticScore { get; set; }
    public double FinalScore { get; set; }
    public string Level { get; set; } = "Unknown";
    public string AssignmentId { get; set; } = string.Empty;
    public DateTime AnalyzedAt { get; set; }
}

/// <summary>Per-assignment aggregated summary (teacher/admin only).</summary>
public class AssignmentSimilaritySummaryDto
{
    public string AssignmentId { get; set; } = string.Empty;
    public int TotalSubmissions { get; set; }
    public int AnalyzedSubmissions { get; set; }
    public int HighSimilarityPairs { get; set; }
    public List<SimilaritySummaryDto> Submissions { get; set; } = new();
}
