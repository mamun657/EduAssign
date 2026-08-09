using EduAssignPro.Domain.Common;
using EduAssignPro.Domain.Enums;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduAssignPro.Domain.Entities;

[BsonCollection(Constants.AssignmentsCollection)]
public class Assignment
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("teacherId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string TeacherId { get; set; } = string.Empty;

    [BsonElement("studentId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string StudentId { get; set; } = string.Empty;

    [BsonElement("subjectId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SubjectId { get; set; } = string.Empty;

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("description")]
    [BsonIgnoreIfNull]
    public string? Description { get; set; }

    [BsonElement("dueDate")]
    public DateTime DueDate { get; set; }

    [BsonElement("isPublished")]
    public bool IsPublished { get; set; }

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("submissionText")]
    [BsonIgnoreIfNull]
    public string? SubmissionText { get; set; }

    [BsonElement("submittedAt")]
    [BsonIgnoreIfNull]
    public DateTime? SubmittedAt { get; set; }

    [BsonElement("marks")]
    [BsonIgnoreIfNull]
    public decimal? Marks { get; set; }

    [BsonElement("feedback")]
    [BsonIgnoreIfNull]
    public string? Feedback { get; set; }

    [BsonElement("status")]
    [BsonRepresentation(BsonType.String)]
    public AssignmentStatus Status { get; set; } = AssignmentStatus.Draft;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}