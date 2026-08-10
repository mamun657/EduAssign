using System.Net.Http.Json;
using EduAssignPro.Application.Abstractions;
using EduAssignPro.Application.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EduAssignPro.Application.Services;

/// <summary>
/// Phase 6: HttpClient-based implementation of <see cref="IMlClient"/>.
/// Hosts call into Python FastAPI sidecar at <see cref="SimilarityOptions.MlServiceUrl"/>.
/// </summary>
public class SimilarityMlClient : IMlClient, IEmbeddingCache
{
    private readonly HttpClient _http;
    private readonly SimilarityOptions _options;
    private readonly ILogger<SimilarityMlClient> _logger;
    private readonly Dictionary<string, float[]> _cache = new(StringComparer.Ordinal);

    public SimilarityMlClient(HttpClient http, IOptions<SimilarityOptions> options, ILogger<SimilarityMlClient> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
        _http.BaseAddress ??= new Uri(_options.MlServiceUrl.TrimEnd('/') + "/");
        _http.Timeout = TimeSpan.FromSeconds(Math.Max(5, _options.MlTimeoutSeconds));
    }

    public async Task<bool> IsHealthyAsync(CancellationToken ct = default)
    {
        try
        {
            using var resp = await _http.GetAsync("healthz", ct);
            return resp.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "ML sidecar health check failed");
            return false;
        }
    }

    public async Task<float[]?> EmbedAsync(string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var key = ComputeKey(text);
        if (_cache.TryGetValue(key, out var hit)) return hit;

        try
        {
            using var resp = await _http.PostAsJsonAsync("embed", new { text }, ct);
            if (!resp.IsSuccessStatusCode)
            {
                _logger.LogWarning("ML /embed returned {Status}", resp.StatusCode);
                return null;
            }
            var payload = await resp.Content.ReadFromJsonAsync<EmbedResponse>(cancellationToken: ct);
            if (payload?.embedding is null || payload.embedding.Length == 0) return null;
            var vec = payload.embedding.Select(f => (float)f).ToArray();
            _cache[key] = vec;
            return vec;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ML /embed call failed");
            return null;
        }
    }

    public bool TryGet(string key, out float[]? vector)
    {
        var ok = _cache.TryGetValue(key, out var v);
        vector = v;
        return ok;
    }

    public void Set(string key, float[] vector) => _cache[key] = vector;

    private static string ComputeKey(string text)
    {
        unchecked
        {
            int hash = 17;
            foreach (var c in text) hash = hash * 31 + c;
            return $"len:{text.Length}:h:{hash:X8}";
        }
    }

    private class EmbedResponse
    {
        public double[]? embedding { get; set; }
    }
}
