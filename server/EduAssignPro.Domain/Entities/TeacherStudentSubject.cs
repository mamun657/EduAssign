using EduAssignPro.Domain.Common;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduAssignPro.Domain.Entities;

[BsonCollection(Constants.TeacherStudentSubjectsCollection)]
public class TeacherStudentSubject
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

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;
}