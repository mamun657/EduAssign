using EduAssignPro.Application.Abstractions;
using EduAssignPro.Domain.Entities;
using MongoDB.Driver;

namespace EduAssignPro.Infrastructure.Mongo;

public class MongoIndexInitializer : IUnitOfWork
{
    private readonly MongoContext _ctx;

    public MongoIndexInitializer(MongoContext ctx)
    {
        _ctx = ctx;
    }

    public async Task EnsureIndexesAsync(CancellationToken ct = default)
    {
        // Users.Email UNIQUE
        var users = _ctx.Users.Indexes;
        await users.CreateOneAsync(new CreateIndexModel<User>(
            Builders<User>.IndexKeys.Ascending(u => u.Email),
            new CreateIndexOptions { Unique = true, Name = "UX_Users_Email" }), cancellationToken: ct);

        // AcademicLevels.Code UNIQUE
        var levels = _ctx.AcademicLevels.Indexes;
        await levels.CreateOneAsync(new CreateIndexModel<AcademicLevel>(
            Builders<AcademicLevel>.IndexKeys.Ascending(a => a.Code),
            new CreateIndexOptions { Unique = true, Name = "UX_AcademicLevels_Code" }), cancellationToken: ct);

        // Subjects.Code UNIQUE
        var subjects = _ctx.Subjects.Indexes;
        await subjects.CreateOneAsync(new CreateIndexModel<Subject>(
            Builders<Subject>.IndexKeys.Ascending(s => s.Code),
            new CreateIndexOptions { Unique = true, Name = "UX_Subjects_Code" }), cancellationToken: ct);

        // CurriculumSubjects.(AcademicLevelId + SubjectId) UNIQUE
        var cs = _ctx.CurriculumSubjects.Indexes;
        await cs.CreateOneAsync(new CreateIndexModel<CurriculumSubject>(
            Builders<CurriculumSubject>.IndexKeys
                .Ascending(c => c.AcademicLevelId)
                .Ascending(c => c.SubjectId),
            new CreateIndexOptions { Unique = true, Name = "UX_CurriculumSubjects_AcademicLevel_Subject" }), cancellationToken: ct);

        // StudentSubjectEnrollments.(StudentId + SubjectId) UNIQUE
        var enrollments = _ctx.StudentSubjectEnrollments.Indexes;
        await enrollments.CreateOneAsync(new CreateIndexModel<StudentSubjectEnrollment>(
            Builders<StudentSubjectEnrollment>.IndexKeys
                .Ascending(e => e.StudentId)
                .Ascending(e => e.SubjectId),
            new CreateIndexOptions { Unique = true, Name = "UX_StudentSubjectEnrollments_Student_Subject" }), cancellationToken: ct);

        // TeacherStudentSubjects.(TeacherId + StudentId + SubjectId) UNIQUE
        var tss = _ctx.TeacherStudentSubjects.Indexes;
        await tss.CreateOneAsync(new CreateIndexModel<TeacherStudentSubject>(
            Builders<TeacherStudentSubject>.IndexKeys
                .Ascending(t => t.TeacherId)
                .Ascending(t => t.StudentId)
                .Ascending(t => t.SubjectId),
            new CreateIndexOptions { Unique = true, Name = "UX_TeacherStudentSubjects_Teacher_Student_Subject" }), cancellationToken: ct);

        // Common query-side indexes (non-unique)
        await _ctx.Assignments.Indexes.CreateManyAsync(new[]
        {
            new CreateIndexModel<Assignment>(
                Builders<Assignment>.IndexKeys.Ascending(a => a.TeacherId),
                new CreateIndexOptions { Name = "IX_Assignments_TeacherId" }),
            new CreateIndexModel<Assignment>(
                Builders<Assignment>.IndexKeys.Ascending(a => a.StudentId),
                new CreateIndexOptions { Name = "IX_Assignments_StudentId" }),
            new CreateIndexModel<Assignment>(
                Builders<Assignment>.IndexKeys.Ascending(a => a.SubjectId),
                new CreateIndexOptions { Name = "IX_Assignments_SubjectId" })
        }, ct);

        // Phase 6: Similarity analysis indexes
        var sim = _ctx.SimilarityAnalyses.Indexes;
        await sim.CreateManyAsync(new[]
        {
            new CreateIndexModel<SimilarityAnalysis>(
                Builders<SimilarityAnalysis>.IndexKeys
                    .Ascending(s => s.SubmissionId)
                    .Ascending(s => s.Status),
                new CreateIndexOptions { Name = "IX_SimilarityAnalyses_Submission_Status" }),
            new CreateIndexModel<SimilarityAnalysis>(
                Builders<SimilarityAnalysis>.IndexKeys.Ascending(s => s.AssignmentId),
                new CreateIndexOptions { Name = "IX_SimilarityAnalyses_Assignment" }),
            new CreateIndexModel<SimilarityAnalysis>(
                Builders<SimilarityAnalysis>.IndexKeys.Ascending(s => s.StudentId),
                new CreateIndexOptions { Name = "IX_SimilarityAnalyses_Student" })
        }, ct);
    }
}
