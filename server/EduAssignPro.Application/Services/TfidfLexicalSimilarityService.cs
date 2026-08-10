using System.Text;
using System.Text.RegularExpressions;

namespace EduAssignPro.Application.Services;

/// <summary>
/// Phase 6: TF-IDF + Cosine Similarity lexical engine. Pure C#, no external dependencies.
/// </summary>
public class TfidfLexicalSimilarityService
{
    private static readonly Regex Tokenizer = new(@"[\p{L}\p{Nd}]+", RegexOptions.Compiled);

    /// <summary>
    /// Tokenize text into lowercase word tokens. Drops empty tokens and short noise.
    /// </summary>
    public static List<string> Tokenize(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return new List<string>();
        var matches = Tokenizer.Matches(text.ToLowerInvariant());
        var tokens = new List<string>(matches.Count);
        foreach (Match m in matches)
        {
            var t = m.Value;
            if (t.Length < 2) continue;     // skip single letters / 1-digit numbers
            tokens.Add(t);
        }
        return tokens;
    }

    /// <summary>
    /// Compute cosine similarity (0..1) between two documents using TF-IDF vectors.
    /// </summary>
    public double CosineSimilarity(string docA, string docB)
    {
        var tokensA = Tokenize(docA);
        var tokensB = Tokenize(docB);
        if (tokensA.Count == 0 || tokensB.Count == 0) return 0d;

        var tfA = TermFrequency(tokensA);
        var tfB = TermFrequency(tokensB);

        var idf = new Dictionary<string, double>(StringComparer.Ordinal);
        foreach (var term in tfA.Keys) idf[term] = 0d;
        foreach (var term in tfB.Keys) idf.TryAdd(term, 0d);
        foreach (var term in idf.Keys.ToList())
        {
            int df = 0;
            if (tfA.ContainsKey(term)) df++;
            if (tfB.ContainsKey(term)) df++;
            idf[term] = Math.Log((2d + 1d) / (df + 1d)) + 1d;   // smoothed IDF
        }

        double dot = 0d, na = 0d, nb = 0d;
        foreach (var term in idf.Keys)
        {
            var wA = tfA.TryGetValue(term, out var a) ? a * idf[term] : 0d;
            var wB = tfB.TryGetValue(term, out var b) ? b * idf[term] : 0d;
            dot += wA * wB;
            na += wA * wA;
            nb += wB * wB;
        }
        if (na == 0d || nb == 0d) return 0d;
        var sim = dot / (Math.Sqrt(na) * Math.Sqrt(nb));
        // Clamp to [0,1].
        if (sim < 0d) sim = 0d;
        if (sim > 1d) sim = 1d;
        return sim;
    }

    private static Dictionary<string, double> TermFrequency(List<string> tokens)
    {
        var tf = new Dictionary<string, double>(StringComparer.Ordinal);
        var total = tokens.Count;
        foreach (var t in tokens)
        {
            if (tf.TryGetValue(t, out var v)) tf[t] = v + 1d;
            else tf[t] = 1d;
        }
        if (total > 0)
        {
            foreach (var k in tf.Keys.ToList()) tf[k] = tf[k] / total;
        }
        return tf;
    }
}
