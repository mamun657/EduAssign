using EduAssignPro.Application.Abstractions;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.GridFS;

namespace EduAssignPro.Infrastructure.Repositories;

/// <summary>
/// MongoDB GridFS-backed file storage for assignment + submission attachments.
/// All files share the "attachments" bucket so we get a single, ordered stream namespace.
/// </summary>
public class GridFsFileRepository : IFileRepository
{
    private readonly IGridFSBucket _bucket;

    public GridFsFileRepository(MongoDB.Driver.IMongoDatabase database)
    {
        _bucket = new GridFSBucket(database, new GridFSBucketOptions
        {
            BucketName = "attachments",
            ChunkSizeBytes = 255 * 1024, 
        });
    }

    public async Task<StoredFile> UploadAsync(
        Stream stream,
        string fileName,
        string contentType,
        CancellationToken ct = default)
    {
        var options = new GridFSUploadOptions
        {
            Metadata = new BsonDocument
            {
                { "contentType", contentType },
                { "uploadedAt", DateTime.UtcNow }
            }
        };

        var id = await _bucket.UploadFromStreamAsync(fileName, stream, options, ct);

        var filter = Builders<GridFSFileInfo>.Filter.Eq("_id", id);
        var info = await _bucket.FindAsync(filter, cancellationToken: ct);
        var doc = await info.FirstOrDefaultAsync(ct);
        if (doc is null) throw new InvalidOperationException("File uploaded but could not be read back.");

        return new StoredFile
        {
            Id = doc.Id.ToString(),
            FileName = doc.Filename ?? fileName,
            ContentType = contentType,
            Size = doc.Length,
        };
    }

    public async Task<StoredFile?> GetAsync(string id, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(id, out var oid)) return null;
        var filter = Builders<GridFSFileInfo>.Filter.Eq("_id", oid);
        var cursor = await _bucket.FindAsync(filter, cancellationToken: ct);
        var info = await cursor.FirstOrDefaultAsync(ct);
        if (info is null) return null;

        var contentType = info.Metadata?
            .GetValue("contentType", BsonNull.Value) is BsonString s
            ? s.AsString
            : "application/octet-stream";

        var stored = new StoredFile
        {
            Id = info.Id.ToString(),
            FileName = info.Filename ?? "download",
            ContentType = contentType,
            Size = info.Length,
        };
        stored.WithOpenStream(() => _bucket.OpenDownloadStreamAsync(oid, cancellationToken: ct).GetAwaiter().GetResult());
        return stored;
    }

    public async Task DeleteAsync(string id, CancellationToken ct = default)
    {
        if (!ObjectId.TryParse(id, out var oid)) return;
        await _bucket.DeleteAsync(oid, ct);
    }
}