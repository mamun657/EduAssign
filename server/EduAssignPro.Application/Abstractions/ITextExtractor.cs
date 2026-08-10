namespace EduAssignPro.Application.Abstractions;

/// <summary>
/// Phase 6: Extracts plain text from a stored file (PDF, TXT, image-with-text-extraction-fallback).
/// Returns empty string when no text can be extracted (e.g. scanned image without OCR).
/// </summary>
public interface ITextExtractor
{
    /// <summary>
    /// Extract text from the given file bytes / metadata.
    /// </summary>
    /// <param name="contentType">Mime type, e.g. "application/pdf" or "text/plain".</param>
    /// <param name="fileName">Original file name (used as fallback hint).</param>
    /// <param name="data">Raw file bytes.</param>
    Task<string> ExtractAsync(string contentType, string fileName, byte[] data, CancellationToken ct = default);
}
