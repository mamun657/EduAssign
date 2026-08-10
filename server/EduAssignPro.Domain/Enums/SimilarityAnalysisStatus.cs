namespace EduAssignPro.Domain.Enums;

/// <summary>
/// Phase 6: Lifecycle states for a similarity analysis job.
/// </summary>
public enum SimilarityAnalysisStatus
{
    /// <summary>Created but not yet analyzed.</summary>
    NotAnalyzed = 0,

    /// <summary>Analysis is currently running (extraction / embeddings / scoring).</summary>
    Analyzing = 1,

    /// <summary>Analysis completed successfully. Scores are populated.</summary>
    Completed = 2,

    /// <summary>Analysis failed (e.g. text extraction or ML service unavailable). ErrorMessage populated.</summary>
    Failed = 3
}
