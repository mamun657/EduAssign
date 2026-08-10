namespace EduAssignPro.Application.Abstractions;

/// <summary>
/// Phase 6: Thin client over the Python FastAPI sidecar that hosts the
/// paraphrase-multilingual-MiniLM-L12-v2 model. Used for semantic embeddings only.
/// </summary>
public interface IMlClient
{
    /// <summary>Whether the ML sidecar is currently reachable.</summary>
    Task<bool> IsHealthyAsync(CancellationToken ct = default);

    /// <summary>Compute the embedding vector for a piece of text. Returns null on failure.</summary>
    Task<float[]?> EmbedAsync(string text, CancellationToken ct = default);
}

/// <summary>Optional helper to store embeddings in-process keyed by submission id,
/// avoiding re-running the model for the same text within a process lifetime.</summary>
public interface IEmbeddingCache
{
    bool TryGet(string key, out float[]? vector);
    void Set(string key, float[] vector);
}
