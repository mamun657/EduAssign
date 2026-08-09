using EduAssignPro.Domain.Common;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduAssignPro.Domain.Entities;

[BsonCollection(Constants.StudentSubjectEnrollmentsCollection)]
public class StudentSubjectEnrollment
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("studentId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string StudentId { get; set; } = string.Empty;

    [BsonElement("subjectId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SubjectId { get; set; } = string.Empty;

    [BsonElement("curriculumSubjectId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string CurriculumSubjectId { get; set; } = string.Empty;

    [BsonElement("enrolledAt")]
    public DateTime EnrolledAt { get; set; } = DateTime.UtcNow;

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;
}