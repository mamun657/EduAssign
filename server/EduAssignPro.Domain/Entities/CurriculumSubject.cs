using EduAssignPro.Domain.Common;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace EduAssignPro.Domain.Entities;

[BsonCollection(Constants.CurriculumSubjectsCollection)]
public class CurriculumSubject
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("academicLevelId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string AcademicLevelId { get; set; } = string.Empty;

    [BsonElement("subjectId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SubjectId { get; set; } = string.Empty;

    [BsonElement("isCompulsory")]
    public bool IsCompulsory { get; set; }

    /// <summary>
    /// Group identifier for elective subjects (e.g. "ScienceOptional").
    /// Null when IsCompulsory = true.
    /// </summary>
    [BsonElement("electiveGroup")]
    [BsonIgnoreIfNull]
    public string? ElectiveGroup { get; set; }

    /// <summary>
    /// Maximum number of subjects a student can choose from the elective group.
    /// Only meaningful when IsCompulsory = false.
    /// </summary>
    [BsonElement("maxChoicesInGroup")]
    [BsonIgnoreIfNull]
    public int? MaxChoicesInGroup { get; set; }

    /// <summary>
    /// Optional identifier for a "paper option" within an elective group.
    /// <para>
    /// An elective group may offer several OPTIONS (e.g. College ScienceOptional
    /// offers Biology and Higher Mathematics). When a student picks ONE option,
    /// all curriculum subjects sharing the same <c>(ElectiveGroup, ElectiveOption)</c>
    /// pair are enrolled together. The student cannot pick subjects from two
    /// different options in the same group.
    /// </para>
    /// <para>Null when the elective group has a single option, or for compulsory subjects.</para>
    /// </summary>
    [BsonElement("electiveOption")]
    [BsonIgnoreIfNull]
    public string? ElectiveOption { get; set; }

    [BsonElement("isActive")]
    public bool IsActive { get; set; } = true;

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}