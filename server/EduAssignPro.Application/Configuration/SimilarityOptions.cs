using EduAssignPro.Domain.Common;

namespace EduAssignPro.Application.Configuration;

/// <summary>
/// Phase 6: Configurable similarity detection options bound from "Similarity" config section.
/// </summary>
public class SimilarityOptions
{
    public const string SectionName = "Similarity";

    /// <summary>Base URL of the Python FastAPI sidecar hosting MiniLM embeddings.</summary>
    public string MlServiceUrl { get; set; } = "http://localhost:8001";

    /// <summary>Timeout (seconds) for one ML HTTP call.</summary>
    public int MlTimeoutSeconds { get; set; } = 30;

    /// <summary>Lexical weight in hybrid formula (0..1).</summary>
    public double LexicalWeight { get; set; } = Constants.DefaultLexicalWeight;

    /// <summary>Semantic weight in hybrid formula (0..1).</summary>
    public double SemanticWeight { get; set; } = Constants.DefaultSemanticWeight;

    /// <summary>Below this overall score → Low.</summary>
    public double LowThreshold { get; set; } = Constants.DefaultLowThreshold;

    /// <summary>Below this overall score (and &gt;= LowThreshold) → Moderate; else High.</summary>
    public double ModerateThreshold { get; set; } = Constants.DefaultModerateThreshold;

    /// <summary>How many top matches to store per submission.</summary>
    public int TopMatches { get; set; } = Constants.DefaultTopMatches;

    /// <summary>Skip storing matches whose final score is below this cutoff (0-100).</summary>
    public double MinCompareScore { get; set; } = Constants.DefaultMinCompareScore;

    /// <summary>Disable semantic scoring entirely (falls back to lexical-only).</summary>
    public bool DisableSemantic { get; set; } = false;
}
