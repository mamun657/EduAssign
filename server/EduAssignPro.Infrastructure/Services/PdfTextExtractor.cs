using System.Text;
using EduAssignPro.Application.Abstractions;
using UglyToad.PdfPig;

namespace EduAssignPro.Infrastructure.Services;

/// <summary>
/// Phase 6: PDF + plaintext text extractor. Uses PdfPig (already in dependency tree for Phase 4
/// attachment rendering). For images, returns empty string (no OCR in scope).
/// </summary>
public class PdfTextExtractor : ITextExtractor
{
    public async Task<string> ExtractAsync(string contentType, string fileName, byte[] data, CancellationToken ct = default)
    {
        if (data is null || data.Length == 0) return string.Empty;

        var ct1 = (contentType ?? string.Empty).ToLowerInvariant();
        var fn = (fileName ?? string.Empty).ToLowerInvariant();

        try
        {
            if (ct1 == "application/pdf" || fn.EndsWith(".pdf"))
            {
                return await Task.Run(() => ExtractPdf(data), ct);
            }
            if (ct1 == "text/plain" || fn.EndsWith(".txt") || fn.EndsWith(".md"))
            {
                return Encoding.UTF8.GetString(data);
            }
            if (ct1.StartsWith("image/") || fn.EndsWith(".png") || fn.EndsWith(".jpg") || fn.EndsWith(".jpeg")
                || fn.EndsWith(".webp") || fn.EndsWith(".gif"))
            {
                // No OCR in scope.
                return string.Empty;
            }
            if (fn.EndsWith(".doc") || fn.EndsWith(".docx"))
            {
                // Binary office formats — extract best-effort as plain UTF-8 text (will be garbage for compressed docs).
                return Encoding.UTF8.GetString(data);
            }
        }
        catch
        {
            return string.Empty;
        }
        return string.Empty;
    }

    private static string ExtractPdf(byte[] data)
    {
        var sb = new StringBuilder();
        using var pdf = PdfDocument.Open(data);
        foreach (var page in pdf.GetPages())
        {
            var text = page.Text ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(text)) sb.AppendLine(text);
        }
        return sb.ToString();
    }
}
