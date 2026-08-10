using EduAssignPro.Domain.Common;
using EduAssignPro.Domain.Entities;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace EduAssignPro.Infrastructure.Mongo;

public class MongoSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = "EduAssignPro";
}

public class MongoContext
{
    public IMongoDatabase Database { get; }
    public IMongoClient Client { get; }

    public MongoContext(IOptions<MongoSettings> options)
    {
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.ConnectionString))
            throw new InvalidOperationException("MongoDB ConnectionString is not configured.");

        Client = new MongoClient(settings.ConnectionString);
        Database = Client.GetDatabase(settings.DatabaseName);
    }

    public IMongoCollection<T> GetCollection<T>()
    {
        var attr = (BsonCollectionAttribute?)Attribute.GetCustomAttribute(typeof(T), typeof(BsonCollectionAttribute));
        var name = attr?.CollectionName ?? typeof(T).Name;
        return Database.GetCollection<T>(name);
    }

    public IMongoCollection<User> Users => GetCollection<User>();
    public IMongoCollection<AcademicLevel> AcademicLevels => GetCollection<AcademicLevel>();
    public IMongoCollection<Subject> Subjects => GetCollection<Subject>();
    public IMongoCollection<CurriculumSubject> CurriculumSubjects => GetCollection<CurriculumSubject>();
    public IMongoCollection<StudentSubjectEnrollment> StudentSubjectEnrollments => GetCollection<StudentSubjectEnrollment>();
    public IMongoCollection<TeacherStudentSubject> TeacherStudentSubjects => GetCollection<TeacherStudentSubject>();
    public IMongoCollection<Assignment> Assignments => GetCollection<Assignment>();
    public IMongoCollection<SimilarityAnalysis> SimilarityAnalyses => GetCollection<SimilarityAnalysis>();
}
