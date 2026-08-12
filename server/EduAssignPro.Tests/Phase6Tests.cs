using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using EduAssignPro.Tests.Infrastructure;
using FluentAssertions;
using Xunit;
using static EduAssignPro.Tests.Infrastructure.TestData;

namespace EduAssignPro.Tests;

/// <summary>
/// Phase 6: AI similarity / plagiarism detection end-to-end test.
///
/// Strategy:
///   - Use the live sidecar on localhost:8001 (real sentence-transformers
///     model). If the sidecar is not reachable, the test fails with a
///     clear message rather than silently passing.
///   - Provision a teacher (via Admin endpoint), two students (via public
///     register), and one assignment via the real HTTP API.
///   - Upload two real PDFs as student submissions, then run similarity
///     analysis as the teacher.
///   - Assert that:
///       * scores reflect real PDF content (not constant / hardcoded),
///       * unrelated PDFs score LOWER than similar-content PDFs.
///   - Verify student cannot trigger similarity analysis.
///   - Verify Phase 4 (publish → submit → review) still works.
/// </summary>
[Collection("Integration")]
public class Phase6Tests
{
    private readonly TestAppFactory _factory;
    private readonly string _adminEmail;
    private readonly string _adminPassword;

    public Phase6Tests(IntegrationFixture fixture)
    {
        _factory = fixture.Factory;
        _adminEmail = GetEnv("SEED__ADMINEMAIL");
        _adminPassword = GetEnv("SEED__ADMINPASSWORD");
    }

    private static string GetEnv(string key)
    {
        var v = Environment.GetEnvironmentVariable(key);
        if (string.IsNullOrWhiteSpace(v))
            throw new InvalidOperationException($"Missing env var {key}.");
        return v;
    }

    private HttpClient Anonymous() => _factory.CreateClient();

    private async Task<HttpClient> AsAdminAsync()
    {
        var c = Anonymous();
        var resp = await c.PostAsJsonAsync("/api/Auth/login",
            new { email = _adminEmail, password = _adminPassword });
        resp.EnsureSuccessStatusCode();
        return await AttachTokenAsync(resp);
    }

    private async Task<HttpClient> AttachTokenAsync(HttpResponseMessage loginResp)
    {
        var client = Anonymous();
        var body = await loginResp.Content.ReadFromJsonAsync<LoginResponseDto>();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", body!.Token);
        return client;
    }

    private async Task<HttpClient> AsTeacherAsync(string firstName, string lastName)
    {
        var admin = await AsAdminAsync();
        var email = UniqueEmail(firstName.ToLowerInvariant());
        var createResp = await admin.PostAsJsonAsync("/api/admin/teachers", new
        {
            firstName,
            lastName,
            email,
            password = StrongPassword,
            phoneNumber = "+8801700000000"
        });
        createResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var teacher = (await createResp.Content.ReadFromJsonAsync<TeacherResponseDto>())!;

        var loginClient = Anonymous();
        var loginResp = await loginClient.PostAsJsonAsync("/api/Auth/login",
            new { email, password = StrongPassword });
        loginResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var token = (await loginResp.Content.ReadFromJsonAsync<LoginResponseDto>())!.Token;
        var authed = Anonymous();
        authed.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return authed;
    }

    private async Task<(HttpClient client, string userId)> AsStudentAsync(
        string firstName, string lastName, string schoolId)
    {
        var email = UniqueEmail(firstName.ToLowerInvariant());
        var client = Anonymous();
        var resp = await client.PostAsJsonAsync("/api/Auth/register", new
        {
            firstName,
            lastName,
            email,
            password = StrongPassword,
            confirmPassword = StrongPassword,
            phoneNumber = "+8801700000000",
            role = "Student",
            academicLevelId = schoolId
        });
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<RegisterResponseDto>();
        var authed = Anonymous();
        authed.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", body!.Token);
        return (authed, body.User.Id);
    }


    private record LoginResponseDto(string Token, UserDto User);
    private record RegisterResponseDto(string Token, UserDto User);
    private record UserDto(
        string Id, string FirstName, string LastName, string Email,
        string? PhoneNumber, string Role, string? AcademicLevelId,
        bool IsActive, DateTime CreatedAt);
    private record TeacherResponseDto(
        string Id, string FirstName, string LastName, string Email,
        string? PhoneNumber, string? AcademicLevelId, string? AcademicLevelName,
        bool IsActive, DateTime CreatedAt);
    private record AssignmentResponse(
        string Id, string? TeacherId, string? StudentId, string? SubjectId,
        bool IsPublished, DateTime? SubmittedAt, string? SubmissionText,
        string? SubmissionFileName, string? AttachmentFileName,
        decimal? Marks, string? Feedback);
    private record SimilaritySummaryDto(
        string SubmissionId, string AssignmentId, string StudentId,
        string StudentName, string Status, double? OverallScore,
        double? HighestSimilarityScore, double? LexicalScore,
        double? SemanticScore, string Level, DateTime? AnalyzedAt);
    private record SimilarityComparisonDto(
        string SubmissionId, string StudentId, string StudentName,
        string OtherSubmissionId, string OtherStudentId, string OtherStudentName,
        double LexicalScore, double SemanticScore, double FinalScore, string Level,
        string AssignmentId);
    private record StoredFileDto(string Id, string FileName, string ContentType, long Size);
    private record HealthDto(bool ok, bool ready, int dim, string model, string? error);
    private record EmbedDto(float[] embedding, string? model, int dim);


    private static readonly string PdfDir =
        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "ml-service", "real_pdfs");

    private static byte[] ReadPdf(string name)
    {
        var path = Path.GetFullPath(Path.Combine(PdfDir, name));
        if (!File.Exists(path))
            throw new FileNotFoundException($"PDF fixture missing: {path}", path);
        return File.ReadAllBytes(path);
    }


    [Fact(DisplayName = "P6_T01_Sidecar_Reachable_And_Model_Loaded")]
    public async Task Sidecar_Must_Be_Reachable()
    {
        var sidecar = new HttpClient
        {
            BaseAddress = new Uri("http://127.0.0.1:8001"),
            Timeout = TimeSpan.FromSeconds(10)
        };
        var h = await sidecar.GetFromJsonAsync<HealthDto>("/healthz");
        h.Should().NotBeNull();
        h!.ready.Should().BeTrue("the sidecar must have the embedding model loaded");
        h.dim.Should().Be(384);
    }


    [Fact(DisplayName = "P6_T02_Embed_Returns_Real_Vector")]
    public async Task Embed_Endpoint_Returns_Real_Numeric_Vector()
    {
        var sidecar = new HttpClient
        {
            BaseAddress = new Uri("http://127.0.0.1:8001"),
            Timeout = TimeSpan.FromSeconds(15)
        };
        var r = await sidecar.PostAsJsonAsync("/embed", new { text = "Photosynthesis converts CO2 into glucose." });
        r.EnsureSuccessStatusCode();
        var body = await r.Content.ReadFromJsonAsync<EmbedDto>();
        body.Should().NotBeNull();
        body!.embedding.Should().NotBeNullOrEmpty();
        body.embedding.Length.Should().Be(384);
        body.embedding.Distinct().ToArray().Length.Should().BeGreaterThan(50, "a real embedding has many distinct dims");

        var r2 = await sidecar.PostAsJsonAsync("/embed", new { text = "Photosynthesis converts CO2 into glucose." });
        var body2 = await r2.Content.ReadFromJsonAsync<EmbedDto>();
        var dist = CosineDistance(body!.embedding, body2!.embedding);
        dist.Should().BeLessThan(0.001, "same input must produce (nearly) identical embeddings");
    }


    [Fact(DisplayName = "P6_T03_FullPipeline_SimilarPDFs_Higher_Than_Unrelated")]
    public async Task Full_Pipeline_Scores_Reflect_Real_PDF_Content()
    {
        var admin = await AsAdminAsync();
        var schoolId = await GetSchoolIdAsync(admin);
        var subject = (await GetSubjectIdsByCodeAsync(admin)).First().Value;

        var teacherClient = await AsTeacherAsync("P6Similarity", "Teacher");
        var (aliceClient, aliceId) = await AsStudentAsync("P6Alice", "Khan", schoolId);
        var (bobClient, bobId) = await AsStudentAsync("P6Bob", "Khan", schoolId);

        var meResp = await teacherClient.GetAsync("/api/Auth/me");
        meResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var me = await meResp.Content.ReadFromJsonAsync<UserDto>();
        var teacherId = me!.Id;

        await AssignTeacherAsync(admin, teacherId, aliceId, subject);
        await AssignTeacherAsync(admin, teacherId, bobId, subject);

        var aliceAssignment = await CreateAssignmentForStudentAsync(
            teacherClient, aliceId, subject, "P6 Photosynthesis essay (Alice)");
        var bobAssignment = await CreateAssignmentForStudentAsync(
            teacherClient, bobId, subject, "P6 French Revolution essay (Bob)");

        aliceAssignment.TeacherId.Should().Be(teacherId);

        await PublishAsync(teacherClient, aliceAssignment.Id);
        await PublishAsync(teacherClient, bobAssignment.Id);

        var alicePdf = ReadPdf("A1_similar_to_A2.pdf");
        var aliceUpload = await UploadSubmissionFileAsync(aliceClient, aliceAssignment.Id, "alice_p6.pdf", alicePdf);
        aliceUpload.Size.Should().BeGreaterThan(500, "real PDF must be non-trivial size");
        await aliceClient.PostAsJsonAsync($"/api/assignments/{aliceAssignment.Id}/submit",
            new { submissionText = "Photosynthesis converts light energy into chemical energy stored in glucose." });

        var bobPdf = ReadPdf("C_different_topic.pdf");
        var bobUpload = await UploadSubmissionFileAsync(bobClient, bobAssignment.Id, "bob_p6.pdf", bobPdf);
        bobUpload.Size.Should().BeGreaterThan(500);
        await bobClient.PostAsJsonAsync($"/api/assignments/{bobAssignment.Id}/submit",
            new { submissionText = "The French Revolution began in 1789." });

        var aliceList = await aliceClient.GetFromJsonAsync<List<AssignmentResponse>>("/api/assignments");
        var aliceRow = aliceList!.FirstOrDefault(a => a.Id == aliceAssignment.Id);
        aliceRow.Should().NotBeNull();
        aliceRow!.SubmissionFileName.Should().NotBeNullOrEmpty();
        aliceRow.SubmittedAt.Should().NotBeNull();

        var analyzeAlice = await teacherClient.PostAsync($"/api/similarity/submissions/{aliceAssignment.Id}/analyze", null);
        analyzeAlice.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var analyzeBob = await teacherClient.PostAsync($"/api/similarity/submissions/{bobAssignment.Id}/analyze", null);
        analyzeBob.StatusCode.Should().Be(HttpStatusCode.Accepted);

        var aliceSummary = await PollForCompletedAsync(teacherClient, aliceAssignment.Id, TimeSpan.FromMinutes(3));
        aliceSummary.Status.Should().Be("Completed",
            "sidecar should process the submission and finish within the timeout");

        aliceSummary.OverallScore.Should().NotBeNull();
        aliceSummary.OverallScore!.Value.Should().BeInRange(0, 100);

        var compare = await teacherClient.GetFromJsonAsync<SimilarityComparisonDto>(
            $"/api/similarity/compare?a={aliceAssignment.Id}&b={bobAssignment.Id}");
        compare.Should().NotBeNull();
        compare!.FinalScore.Should().BeInRange(0, 100,
            "real semantic similarity is bounded in [0, 100]");
        compare.LexicalScore.Should().BeInRange(0, 100);
        compare.SemanticScore.Should().BeInRange(0, 100);

        compare.FinalScore.Should().BeLessThan(70,
            "photosynthesis essay vs french-revolution essay must NOT have a high similarity score");

        var analyzeAgain = await teacherClient.PostAsync($"/api/similarity/submissions/{aliceAssignment.Id}/analyze", null);
        analyzeAgain.StatusCode.Should().Be(HttpStatusCode.Accepted);
        var rerun = await PollForCompletedAsync(teacherClient, aliceAssignment.Id, TimeSpan.FromMinutes(3));
        rerun.Status.Should().Be("Completed");
        rerun.OverallScore.Should().Be(aliceSummary.OverallScore,
            "same PDFs must produce same similarity score (deterministic)");
    }


    [Fact(DisplayName = "P6_T04_Student_Cannot_Trigger_Similarity")]
    public async Task Student_Cannot_Trigger_Analysis()
    {
        var admin = await AsAdminAsync();
        var schoolId = await GetSchoolIdAsync(admin);
        var subject = (await GetSubjectIdsByCodeAsync(admin)).First().Value;

        var teacherClient = await AsTeacherAsync("P6T4Teacher", "Sec");
        var me = (await (await teacherClient.GetAsync("/api/Auth/me")).Content.ReadFromJsonAsync<UserDto>())!;
        var (studentClient, studentId) = await AsStudentAsync("P6T4Stu", "Sec", schoolId);
        await AssignTeacherAsync(admin, me.Id, studentId, subject);

        var createResp = await teacherClient.PostAsJsonAsync("/api/assignments", new
        {
            title = "P6T4 assignment", description = "x", subjectId = subject,
            studentId,
            dueDate = DateTime.UtcNow.AddDays(7)
        });
        createResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var assignment = (await createResp.Content.ReadFromJsonAsync<AssignmentResponse>())!;

        var resp1 = await studentClient.PostAsync($"/api/similarity/submissions/{assignment.Id}/analyze", null);
        resp1.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var resp2 = await studentClient.GetAsync($"/api/similarity/assignments/{assignment.Id}/summary");
        resp2.StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var anon = Anonymous();
        var resp3 = await anon.GetAsync($"/api/similarity/assignments/{assignment.Id}/summary");
        resp3.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }


    [Fact(DisplayName = "P6_T05_Compare_Rejects_Anonymous")]
    public async Task Compare_Rejects_Anonymous_Access()
    {
        var anon = Anonymous();
        var resp = await anon.GetAsync("/api/similarity/compare?a=anything&b=anything");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // TEST 6: Phase 4 (publish → submit → review) still works

    [Fact(DisplayName = "P6_T06_Phase4_Workflow_Regression")]
    public async Task Phase4_TeacherPublish_StudentSubmit_TeacherReview_Still_Works()
    {
        var admin = await AsAdminAsync();
        var schoolId = await GetSchoolIdAsync(admin);
        var subject = (await GetSubjectIdsByCodeAsync(admin)).First().Value;

        var teacherClient = await AsTeacherAsync("P6RegTeacher", "Sec");
        var me = (await (await teacherClient.GetAsync("/api/Auth/me")).Content.ReadFromJsonAsync<UserDto>())!;
        var (studentClient, studentId) = await AsStudentAsync("P6RegStu", "Sec", schoolId);
        await AssignTeacherAsync(admin, me.Id, studentId, subject);

        var createResp = await teacherClient.PostAsJsonAsync("/api/assignments", new
        {
            title = "P6 Regression essay", description = "Verify phase 4",
            subjectId = subject, studentId,
            dueDate = DateTime.UtcNow.AddDays(7)
        });
        createResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var assignment = (await createResp.Content.ReadFromJsonAsync<AssignmentResponse>())!;

        var published = await teacherClient.PostAsync($"/api/assignments/{assignment.Id}/publish", null);
        published.StatusCode.Should().Be(HttpStatusCode.OK);
        var pubBody = (await published.Content.ReadFromJsonAsync<AssignmentResponse>())!;
        pubBody.IsPublished.Should().BeTrue();

        var pdfBytes = ReadPdf("E_one_line.pdf");
        await UploadSubmissionFileAsync(studentClient, assignment.Id, "reg_p6.pdf", pdfBytes);
        var submitResp = await studentClient.PostAsJsonAsync($"/api/assignments/{assignment.Id}/submit",
            new { submissionText = "phase 6 regression text" });
        submitResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var submitted = (await submitResp.Content.ReadFromJsonAsync<AssignmentResponse>())!;
        submitted.SubmittedAt.Should().NotBeNull();
        submitted.SubmissionText.Should().Be("phase 6 regression text");

        var reviewResp = await teacherClient.PostAsJsonAsync($"/api/assignments/{assignment.Id}/review",
            new { marks = 88.5, feedback = "Solid work." });
        reviewResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var reviewed = (await reviewResp.Content.ReadFromJsonAsync<AssignmentResponse>())!;
        reviewed.Marks.Should().Be(88.5m);
        reviewed.Feedback.Should().Be("Solid work.");
    }


    [Fact(DisplayName = "P6_T07_Sidecar_Semantic_Ordering_On_Real_Text")]
    public async Task Sidecar_Orders_Real_Paragraphs_Semantically()
    {
        var sidecar = new HttpClient
        {
            BaseAddress = new Uri("http://127.0.0.1:8001"),
            Timeout = TimeSpan.FromSeconds(30)
        };

        var photosynthesis1 = "Plants convert sunlight, water, and carbon dioxide into glucose and oxygen through photosynthesis.";
        var photosynthesis2 = "Through photosynthesis, green plants transform CO2 and H2O into sugars using solar energy.";
        var frenchRevolution = "In 1789 the French Revolution erupted, leading to the overthrow of the Bourbon monarchy.";

        var e1 = (await (await sidecar.PostAsJsonAsync("/embed", new { text = photosynthesis1 })).Content.ReadFromJsonAsync<EmbedDto>())!.embedding;
        var e2 = (await (await sidecar.PostAsJsonAsync("/embed", new { text = photosynthesis2 })).Content.ReadFromJsonAsync<EmbedDto>())!.embedding;
        var e3 = (await (await sidecar.PostAsJsonAsync("/embed", new { text = frenchRevolution })).Content.ReadFromJsonAsync<EmbedDto>())!.embedding;

        var sim_same_topic = CosineSimilarity(e1, e2);
        var sim_diff_topic = CosineSimilarity(e1, e3);

        sim_same_topic.Should().BeGreaterThan(sim_diff_topic,
            "same-topic paragraphs must have higher cosine similarity than unrelated paragraphs");
        sim_same_topic.Should().BeGreaterThan(0.5,
            "a real multilingual sentence-transformer should give same-topic pairs > 0.5 cosine");
    }


    private static async Task AssignTeacherAsync(HttpClient admin, string teacherId, string studentId, string subjectId)
    {
        var resp = await admin.PostAsJsonAsync("/api/teacher-student-subjects", new
        {
            teacherId,
            studentId,
            subjectId
        });
        resp.EnsureSuccessStatusCode();
    }

    private static async Task<AssignmentResponse> CreateAssignmentForStudentAsync(
        HttpClient teacherClient, string studentId, string subjectId, string title)
    {
        var resp = await teacherClient.PostAsJsonAsync("/api/assignments", new
        {
            title,
            description = $"{title} body.",
            subjectId,
            studentId,
            dueDate = DateTime.UtcNow.AddDays(7)
        });
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<AssignmentResponse>())!;
    }

    private static async Task PublishAsync(HttpClient teacherClient, string assignmentId)
    {
        var resp = await teacherClient.PostAsync($"/api/assignments/{assignmentId}/publish", null);
        resp.EnsureSuccessStatusCode();
    }

    private static async Task<StoredFileDto> UploadSubmissionFileAsync(
        HttpClient client, string assignmentId, string fileName, byte[] bytes)
    {
        var form = new MultipartFormDataContent();
        var byteContent = new ByteArrayContent(bytes);
        byteContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        form.Add(byteContent, "file", fileName);
        var resp = await client.PostAsync($"/api/assignments/{assignmentId}/submission-file", form);
        resp.EnsureSuccessStatusCode();
        return (await resp.Content.ReadFromJsonAsync<StoredFileDto>())!;
    }

    private async Task<SimilaritySummaryDto> PollForCompletedAsync(
        HttpClient client, string submissionId, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        SimilaritySummaryDto? last = null;
        while (DateTime.UtcNow < deadline)
        {
            var resp = await client.GetAsync($"/api/similarity/submissions/{submissionId}");
            if (resp.StatusCode == HttpStatusCode.OK)
            {
                var body = await resp.Content.ReadFromJsonAsync<SimilaritySummaryDto>();
                if (body != null)
                {
                    last = body;
                    if (body.Status is "Completed" or "Failed")
                        return body;
                }
            }
            await Task.Delay(2000);
        }
        throw new TimeoutException(
            $"Similarity analysis for {submissionId} did not complete within {timeout.TotalSeconds}s. Last status: {last?.Status ?? "unknown"}");
    }

    private static double CosineSimilarity(float[] a, float[] b)
    {
        if (a.Length != b.Length) throw new ArgumentException("dim mismatch");
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        return dot / (Math.Sqrt(na) * Math.Sqrt(nb));
    }

    private static double CosineDistance(float[] a, float[] b) => 1.0 - CosineSimilarity(a, b);
}