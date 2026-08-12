using System.Net;
using System.Net.Http.Json;
using EduAssignPro.Tests.Infrastructure;
using FluentAssertions;
using Xunit;
using static EduAssignPro.Tests.Infrastructure.TestData;

namespace EduAssignPro.Tests;

/// <summary>
/// Full 37-test integration suite for the EduAssign Pro API.
///
/// Strategy:
///   - One shared TestAppFactory (per xUnit collection) pointed at a uniquely
///     named test DB on the same Atlas cluster. The dev database
///     "EduAssignPro" is never touched.
///   - Tests assert behavior of the real HTTP pipeline (controllers, services,
///     repositories, middleware, JWT auth) end-to-end.
///   - Sensitive values (admin password) come from .env via the production
///     loader; tests never print them.
/// </summary>
[Collection("Integration")]
public class EduAssignPro37Tests
{
    private readonly TestAppFactory _factory;
    private readonly string _adminEmail;
    private readonly string _adminPassword;

    public EduAssignPro37Tests(IntegrationFixture fixture)
    {
        _factory = fixture.Factory;
        _adminEmail = GetEnv("SEED__ADMINEMAIL");
        _adminPassword = GetEnv("SEED__ADMINPASSWORD");
    }


    private static string GetEnv(string key)
    {
        var v = Environment.GetEnvironmentVariable(key);
        if (string.IsNullOrWhiteSpace(v))
            throw new InvalidOperationException($"Missing env var {key}. Did the loader run?");
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
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", body!.Token);
        return client;
    }

    private async Task<(HttpClient client, string userId)> AsRegisteredStudentAsync(
        string firstName, string lastName, string role = "Student", string? academicLevelId = null)
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
            role,
            academicLevelId
        });
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<RegisterResponseDto>();
        var authed = Anonymous();
        authed.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", body!.Token);
        return (authed, body.User.Id);
    }

    private record LoginResponseDto(string Token, UserDto User);
    private record RegisterResponseDto(string Token, UserDto User);
    private record UserDto(
        string Id, string FirstName, string LastName, string Email,
        string? PhoneNumber, string Role, string? AcademicLevelId,
        bool IsActive, DateTime CreatedAt);


    [Fact(DisplayName = "01_Register_OK_SchoolStudent")]
    public async Task T01_Register_OK_SchoolStudent()
    {
        var client = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var resp = await client.PostAsJsonAsync("/api/Auth/register", new
        {
            firstName = "Alice",
            lastName = "Khan",
            email = UniqueEmail("alice"),
            password = StrongPassword,
            confirmPassword = StrongPassword,
            role = "Student",
            academicLevelId = schoolId
        });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<RegisterResponseDto>();
        body!.User.Role.Should().Be("Student");
        body.User.AcademicLevelId.Should().Be(schoolId);
    }

    [Fact(DisplayName = "02_Register_MissingFields_400")]
    public async Task T02_Register_MissingFields_400()
    {
        var client = Anonymous();
        var resp = await client.PostAsJsonAsync("/api/Auth/register", new
        {
            firstName = "",
            lastName = "Khan",
            email = UniqueEmail("bob"),
            password = StrongPassword,
            confirmPassword = StrongPassword,
            role = "Student",
            academicLevelId = await GetSchoolIdAsync(await AsAdminAsync())
        });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "03_Register_BadEmail_400")]
    public async Task T03_Register_BadEmail_400()
    {
        var client = Anonymous();
        var resp = await client.PostAsJsonAsync("/api/Auth/register", new
        {
            firstName = "Carol",
            lastName = "Akter",
            email = "not-an-email",
            password = StrongPassword,
            confirmPassword = StrongPassword,
            role = "Student",
            academicLevelId = await GetSchoolIdAsync(await AsAdminAsync())
        });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "04_Register_WeakPassword_400")]
    public async Task T04_Register_WeakPassword_400()
    {
        var client = Anonymous();
        var resp = await client.PostAsJsonAsync("/api/Auth/register", new
        {
            firstName = "Dan",
            lastName = "Mia",
            email = UniqueEmail("dan"),
            password = "weak",
            confirmPassword = "weak",
            role = "Student",
            academicLevelId = await GetSchoolIdAsync(await AsAdminAsync())
        });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "05_Register_DuplicateEmail_409")]
    public async Task T05_Register_DuplicateEmail_409()
    {
        var client = Anonymous();
        var email = UniqueEmail("emma");
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var payload = new
        {
            firstName = "E", lastName = "F", email, password = StrongPassword,
            confirmPassword = StrongPassword, role = "Student", academicLevelId = schoolId
        };
        var first = await client.PostAsJsonAsync("/api/Auth/register", payload);
        first.StatusCode.Should().Be(HttpStatusCode.OK);
        var second = await client.PostAsJsonAsync("/api/Auth/register", payload);
        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact(DisplayName = "06_Login_OK")]
    public async Task T06_Login_OK()
    {
        var client = Anonymous();
        var resp = await client.PostAsJsonAsync("/api/Auth/login",
            new { email = _adminEmail, password = _adminPassword });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<LoginResponseDto>();
        body!.Token.Should().NotBeNullOrEmpty();
        body.User.Role.Should().Be("Admin");
    }

    [Fact(DisplayName = "07_Login_WrongPassword_401")]
    public async Task T07_Login_WrongPassword_401()
    {
        var client = Anonymous();
        var resp = await client.PostAsJsonAsync("/api/Auth/login",
            new { email = _adminEmail, password = "wrong-password" });
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact(DisplayName = "08_Me_Authenticated")]
    public async Task T08_Me_Authenticated()
    {
        var client = await AsAdminAsync();
        var me = await client.GetFromJsonAsync<UserDto>("/api/Auth/me");
        me!.Role.Should().Be("Admin");
        me.Email.Should().Be(_adminEmail);
    }

    [Fact(DisplayName = "09_Admin_Endpoint_Rejects_Student")]
    public async Task T09_Admin_Endpoint_Rejects_Student()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Frank", "Student", "Student", schoolId);
        var resp = await student.GetAsync("/api/admin/students");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact(DisplayName = "10_Register_PublicAdmin_Rejected")]
    public async Task T10_Register_PublicAdmin_Rejected()
    {
        var client = Anonymous();
        var resp = await client.PostAsJsonAsync("/api/Auth/register", new
        {
            firstName = "Greta", lastName = "Admin", email = UniqueEmail("greta"),
            password = StrongPassword, confirmPassword = StrongPassword,
            role = "Admin", academicLevelId = (string?)null
        });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }


    [Fact(DisplayName = "11_GetAcademicLevels")]
    public async Task T11_GetAcademicLevels()
    {
        var admin = await AsAdminAsync();
        var levels = await admin.GetFromJsonAsync<List<AcademicLevelFullDto>>("/api/AcademicLevels");
        levels.Should().NotBeNull();
        levels!.Select(l => l.Code).Should().BeEquivalentTo(new[] { "SCHOOL", "COLLEGE" });
    }

    [Fact(DisplayName = "12_GetSubjects")]
    public async Task T12_GetSubjects()
    {
        var admin = await AsAdminAsync();
        var subjects = await admin.GetFromJsonAsync<List<SubjectDto>>("/api/Subjects");
        subjects.Should().NotBeNull();
        subjects!.Count.Should().Be(18);
    }

    [Fact(DisplayName = "13_GetSubjectsByLevel_School_6")]
    public async Task T13_GetSubjectsByLevel_School_6()
    {
        var admin = await AsAdminAsync();
        var schoolId = await GetSchoolIdAsync(admin);
        var subjects = await admin.GetFromJsonAsync<List<CurriculumSubjectDto>>(
            $"/api/Subjects/by-academic-level/{schoolId}");
        subjects!.Count.Should().Be(6);
    }

    [Fact(DisplayName = "14_GetSubjectsByLevel_College_12")]
    public async Task T14_GetSubjectsByLevel_College_12()
    {
        var admin = await AsAdminAsync();
        var collegeId = await GetCollegeIdAsync(admin);
        var subjects = await admin.GetFromJsonAsync<List<CurriculumSubjectDto>>(
            $"/api/Subjects/by-academic-level/{collegeId}");
        subjects!.Count.Should().Be(12);
    }

    [Fact(DisplayName = "15_UnauthenticatedSubject_401")]
    public async Task T15_UnauthenticatedSubject_401()
    {
        var anon = Anonymous();
        var resp = await anon.GetAsync("/api/Subjects");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }


    [Fact(DisplayName = "16_SchoolStudent_AutoEnrolls_4_Compulsory")]
    public async Task T16_SchoolStudent_AutoEnrolls_4_Compulsory()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Hasan", "School", "Student", schoolId);
        var enrolled = await student.GetFromJsonAsync<List<EnrolledSubjectDto>>(
            "/api/Students/enrolled-subjects");
        enrolled!.Count.Should().Be(4);
        enrolled.Where(e => e.IsCompulsory).Count().Should().Be(4);
        enrolled.Select(e => e.SubjectCode)
            .Should().BeEquivalentTo(new[] { "SCH_PHY", "SCH_CHEM", "SCH_BANG", "SCH_ENG" });
    }

    [Fact(DisplayName = "17_CollegeStudent_AutoEnrolls_8_Compulsory")]
    public async Task T17_CollegeStudent_AutoEnrolls_8_Compulsory()
    {
        var anon = Anonymous();
        var collegeId = await GetCollegeIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Ivy", "College", "Student", collegeId);
        var enrolled = await student.GetFromJsonAsync<List<EnrolledSubjectDto>>(
            "/api/Students/enrolled-subjects");
        enrolled!.Count.Should().Be(8);
        enrolled.All(e => e.IsCompulsory).Should().BeTrue();
    }

    [Fact(DisplayName = "18_SchoolStudent_Selects_Biology")]
    public async Task T18_SchoolStudent_Selects_Biology()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Jamil", "Bio", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        var resp = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["SCH_BIO"] });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var enrolled = await student.GetFromJsonAsync<List<EnrolledSubjectDto>>(
            "/api/Students/enrolled-subjects");
        enrolled!.Count.Should().Be(5);
        enrolled.Any(e => e.SubjectCode == "SCH_BIO").Should().BeTrue();
        enrolled.Any(e => e.SubjectCode == "SCH_HMATH").Should().BeFalse();
    }

    [Fact(DisplayName = "19_SchoolStudent_CannotPickBoth_Electives")]
    public async Task T19_SchoolStudent_CannotPickBoth_Electives()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Kabir", "Two", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        var first = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["SCH_BIO"] });
        first.StatusCode.Should().Be(HttpStatusCode.OK);
        var second = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["SCH_HMATH"] });
        second.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "20_Student_CannotManuallyEnroll_Compulsory")]
    public async Task T20_Student_CannotManuallyEnroll_Compulsory()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Lima", "Comp", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        var resp = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["SCH_PHY"] });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }


    [Fact(DisplayName = "21_CollegeStudent_Selects_BiologyGroup")]
    public async Task T21_CollegeStudent_Selects_BiologyGroup()
    {
        var anon = Anonymous();
        var collegeId = await GetCollegeIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Mona", "ColBio", "Student", collegeId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        var b1 = await student.PostAsJsonAsync("/api/Students/enroll", new { subjectId = subjects["COL_BIO_1"] });
        b1.StatusCode.Should().Be(HttpStatusCode.OK);
        var b2 = await student.PostAsJsonAsync("/api/Students/enroll", new { subjectId = subjects["COL_BIO_2"] });
        b2.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var enrolled = await student.GetFromJsonAsync<List<EnrolledSubjectDto>>(
            "/api/Students/enrolled-subjects");
        enrolled!.Count.Should().Be(10);
        enrolled.Any(e => e.SubjectCode == "COL_BIO_1").Should().BeTrue();
        enrolled.Any(e => e.SubjectCode == "COL_BIO_2").Should().BeTrue();
    }

    [Fact(DisplayName = "22_CollegeStudent_CannotPickBothGroups")]
    public async Task T22_CollegeStudent_CannotPickBothGroups()
    {
        var anon = Anonymous();
        var collegeId = await GetCollegeIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Nadia", "BothGroups", "Student", collegeId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        (await student.PostAsJsonAsync("/api/Students/enroll", new { subjectId = subjects["COL_BIO_1"] }))
            .StatusCode.Should().Be(HttpStatusCode.OK);
        var conflict = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_HMATH_1"] });
        conflict.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "23_Student_CannotRemove_Compulsory")]
    public async Task T23_Student_CannotRemove_Compulsory()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Omar", "CompRm", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        var resp = await student.DeleteAsync($"/api/Students/enroll/{subjects["SCH_PHY"]}");
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "24_Student_CannotEnroll_CrossLevel")]
    public async Task T24_Student_CannotEnroll_CrossLevel()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Poly", "Cross", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        var resp = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_BIO_1"] });
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "25_Student_CanRemove_Elective")]
    public async Task T25_Student_CanRemove_Elective()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Qasim", "RmElec", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        (await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["SCH_BIO"] })).StatusCode.Should().Be(HttpStatusCode.OK);
        var del = await student.DeleteAsync($"/api/Students/enroll/{subjects["SCH_BIO"]}");
        del.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var enrolled = await student.GetFromJsonAsync<List<EnrolledSubjectDto>>(
            "/api/Students/enrolled-subjects");
        enrolled!.Any(e => e.SubjectCode == "SCH_BIO").Should().BeFalse();
        enrolled.Count.Should().Be(4);
    }

    [Fact(DisplayName = "26_MaxChoicesInGroup_Enforced_College")]
    public async Task T26_MaxChoicesInGroup_Enforced_College()
    {
        var anon = Anonymous();
        var collegeId = await GetCollegeIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Rina", "MaxGrp", "Student", collegeId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        (await student.PostAsJsonAsync("/api/Students/enroll", new { subjectId = subjects["COL_BIO_1"] }))
            .StatusCode.Should().Be(HttpStatusCode.OK);
        var hm = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_HMATH_1"] });
        hm.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "27_AvailableCurriculum_Lists_ElectiveGroups")]
    public async Task T27_AvailableCurriculum_Lists_ElectiveGroups()
    {
        var anon = Anonymous();
        var collegeId = await GetCollegeIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Sami", "Avail", "Student", collegeId);
        var avail = await student.GetFromJsonAsync<AvailableCurriculumWithOptionsDto>(
            "/api/Students/available-subjects");
        avail!.CompulsorySubjects.Count.Should().Be(8);
        var scienceOpt = avail.ElectiveGroups.First(g => g.Name == "ScienceOptional");
        scienceOpt.Subjects.Count.Should().Be(4);
        scienceOpt.Options.Count.Should().Be(2);
        scienceOpt.Options.Select(o => o.Key)
            .Should().BeEquivalentTo(new[] { "Biology", "HigherMathematics" });
        scienceOpt.Options.First(o => o.Key == "Biology").Subjects.Count.Should().Be(2);
        scienceOpt.Options.First(o => o.Key == "HigherMathematics").Subjects.Count.Should().Be(2);
        scienceOpt.MaxChoicesInGroup.Should().Be(2);
    }


    [Fact(DisplayName = "38_Biology1_AutoEnrolls_Biology2")]
    public async Task T38_Biology1_AutoEnrolls_Biology2()
    {
        var anon = Anonymous();
        var collegeId = await GetCollegeIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Yara", "Bio12", "Student", collegeId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        var resp = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_BIO_1"] });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var enrolled = await student.GetFromJsonAsync<List<EnrolledSubjectDto>>(
            "/api/Students/enrolled-subjects");
        enrolled!.Where(e => e.SubjectCode == "COL_BIO_1" || e.SubjectCode == "COL_BIO_2")
            .Should().HaveCount(2);
        enrolled.Any(e => e.SubjectCode == "COL_BIO_1").Should().BeTrue();
        enrolled.Any(e => e.SubjectCode == "COL_BIO_2").Should().BeTrue();
    }

    [Fact(DisplayName = "39_Biology_Rejects_HigherMathematics")]
    public async Task T39_Biology_Rejects_HigherMathematics()
    {
        var anon = Anonymous();
        var collegeId = await GetCollegeIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Zara", "BioVsHmath", "Student", collegeId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        (await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_BIO_1"] })).StatusCode.Should().Be(HttpStatusCode.OK);
        (await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_HMATH_1"] })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_HMATH_2"] })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var enrolled = await student.GetFromJsonAsync<List<EnrolledSubjectDto>>(
            "/api/Students/enrolled-subjects");
        enrolled!.Any(e => e.SubjectCode == "COL_HMATH_1").Should().BeFalse();
        enrolled.Any(e => e.SubjectCode == "COL_HMATH_2").Should().BeFalse();
    }

    [Fact(DisplayName = "40_HigherMathematics1_AutoEnrolls_HigherMathematics2")]
    public async Task T40_HigherMathematics1_AutoEnrolls_HigherMathematics2()
    {
        var anon = Anonymous();
        var collegeId = await GetCollegeIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Asif", "Hmath12", "Student", collegeId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        var resp = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_HMATH_1"] });
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var enrolled = await student.GetFromJsonAsync<List<EnrolledSubjectDto>>(
            "/api/Students/enrolled-subjects");
        enrolled!.Where(e => e.SubjectCode == "COL_HMATH_1" || e.SubjectCode == "COL_HMATH_2")
            .Should().HaveCount(2);
        enrolled.Any(e => e.SubjectCode == "COL_HMATH_1").Should().BeTrue();
        enrolled.Any(e => e.SubjectCode == "COL_HMATH_2").Should().BeTrue();
    }

    [Fact(DisplayName = "41_HigherMathematics_Rejects_Biology")]
    public async Task T41_HigherMathematics_Rejects_Biology()
    {
        var anon = Anonymous();
        var collegeId = await GetCollegeIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Bithi", "HmathVsBio", "Student", collegeId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        (await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_HMATH_1"] })).StatusCode.Should().Be(HttpStatusCode.OK);
        (await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_BIO_1"] })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_BIO_2"] })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var enrolled = await student.GetFromJsonAsync<List<EnrolledSubjectDto>>(
            "/api/Students/enrolled-subjects");
        enrolled!.Any(e => e.SubjectCode == "COL_BIO_1").Should().BeFalse();
        enrolled.Any(e => e.SubjectCode == "COL_BIO_2").Should().BeFalse();
    }

    [Fact(DisplayName = "42_DirectAPI_CrossOption_Rejected")]
    public async Task T42_DirectAPI_CrossOption_Rejected()
    {
        var anon = Anonymous();
        var collegeId = await GetCollegeIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Chitra", "DirectApi", "Student", collegeId);
        var subjects = await GetSubjectIdsByCodeAsync(student);

        var bio1 = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_BIO_1"] });
        bio1.StatusCode.Should().Be(HttpStatusCode.OK);

        var bio2 = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_BIO_2"] });
        bio2.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var hm1 = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_HMATH_1"] });
        hm1.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var hm2 = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_HMATH_2"] });
        hm2.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var enrolled = await student.GetFromJsonAsync<List<EnrolledSubjectDto>>(
            "/api/Students/enrolled-subjects");
        enrolled!.Where(e => e.SubjectCode.StartsWith("COL_BIO"))
            .Select(e => e.SubjectCode).Should().BeEquivalentTo(new[] { "COL_BIO_1", "COL_BIO_2" });
        enrolled.Any(e => e.SubjectCode.StartsWith("COL_HMATH")).Should().BeFalse();
    }

    [Fact(DisplayName = "43_School_Elective_Unchanged")]
    public async Task T43_School_Elective_Unchanged()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Dip", "SchoolElec", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        (await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["SCH_BIO"] })).StatusCode.Should().Be(HttpStatusCode.OK);
        var hm = await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["SCH_HMATH"] });
        hm.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var enrolled = await student.GetFromJsonAsync<List<EnrolledSubjectDto>>(
            "/api/Students/enrolled-subjects");
        enrolled!.Any(e => e.SubjectCode == "SCH_BIO").Should().BeTrue();
        enrolled.Any(e => e.SubjectCode == "SCH_HMATH").Should().BeFalse();
    }

    [Fact(DisplayName = "44_Compulsory_Subjects_Unchanged")]
    public async Task T44_Compulsory_Subjects_Unchanged()
    {
        var anon = Anonymous();
        var collegeId = await GetCollegeIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Elif", "Comp", "Student", collegeId);
        var subjects = await GetSubjectIdsByCodeAsync(student);

        var avail = await student.GetFromJsonAsync<AvailableCurriculumWithOptionsDto>(
            "/api/Students/available-subjects");
        avail!.CompulsorySubjects.Should().HaveCount(8);
        avail.CompulsorySubjects.Should().OnlyContain(c => c.IsCompulsory);

        (await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["COL_BIO_1"] })).StatusCode.Should().Be(HttpStatusCode.OK);

        var avail2 = await student.GetFromJsonAsync<AvailableCurriculumWithOptionsDto>(
            "/api/Students/available-subjects");
        avail2!.CompulsorySubjects.Should().HaveCount(8);
    }

    [Fact(DisplayName = "45_MaxChoicesInGroup_Unchanged_For_OtherGroups")]
    public async Task T45_MaxChoicesInGroup_Unchanged_For_OtherGroups()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, _) = await AsRegisteredStudentAsync("Fariha", "MaxGrpOther", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        var avail = await student.GetFromJsonAsync<AvailableCurriculumWithOptionsDto>(
            "/api/Students/available-subjects");
        var groups = avail!.ElectiveGroups;
        groups.Should().NotBeEmpty();
        groups.Should().OnlyContain(g => g.MaxChoicesInGroup >= 1);
        var bioGroup = groups.First(g => g.Subjects.Any(s => s.SubjectCode == "SCH_BIO"));
        bioGroup.MaxChoicesInGroup.Should().Be(1);
        bioGroup.Options.Should().BeEmpty();
    }


    [Fact(DisplayName = "28_Admin_Sees_Only_SelectedSubjects_In_SelectedSubjects")]
    public async Task T28_Admin_Sees_Only_SelectedSubjects_In_SelectedSubjects()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, studentId) = await AsRegisteredStudentAsync("Tahmid", "Abir", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        (await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["SCH_BIO"] })).StatusCode.Should().Be(HttpStatusCode.OK);

        var admin = await AsAdminAsync();
        var detail = await admin.GetFromJsonAsync<AdminStudentDetailDto>(
            $"/api/admin/students/{studentId}");

        detail!.SelectedSubjects.Should().HaveCount(5);
        detail.SelectedSubjects.Select(s => s.SubjectCode)
            .Should().BeEquivalentTo(new[] { "SCH_BIO", "SCH_CHEM", "SCH_BANG", "SCH_ENG", "SCH_PHY" });
        detail.SelectedSubjects.Any(s => s.SubjectCode == "SCH_HMATH").Should().BeFalse();
        detail.AvailableNotSelectedSubjects.Any(s => s.SubjectCode == "SCH_HMATH").Should().BeTrue();
        detail.AvailableNotSelectedSubjects.Any(s => s.SubjectCode == "SCH_BIO").Should().BeFalse();
    }

    [Fact(DisplayName = "29_Admin_Can_Assign_Teacher_Student_SelectedSubject")]
    public async Task T29_Admin_Can_Assign_Teacher_Student_SelectedSubject()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, studentId) = await AsRegisteredStudentAsync("Urmi", "Abir2", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        (await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["SCH_BIO"] })).StatusCode.Should().Be(HttpStatusCode.OK);

        var admin = await AsAdminAsync();
        var teacherEmail = UniqueEmail("rahim");
        var createTeacher = await admin.PostAsJsonAsync("/api/admin/teachers", new
        {
            firstName = "Rahim",
            lastName = "Ahmed",
            email = teacherEmail,
            password = StrongPassword,
            academicLevelId = schoolId
        });
        createTeacher.StatusCode.Should().Be(HttpStatusCode.OK);
        var teacher = await createTeacher.Content.ReadFromJsonAsync<AdminTeacherDto>();

        var assign = await admin.PostAsJsonAsync("/api/teacher-student-subjects", new
        {
            teacherId = teacher!.Id,
            studentId,
            subjectId = subjects["SCH_PHY"]
        });
        assign.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact(DisplayName = "30_Admin_Cannot_Assign_UnenrolledSubject")]
    public async Task T30_Admin_Cannot_Assign_UnenrolledSubject()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, studentId) = await AsRegisteredStudentAsync("Vela", "Abir3", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        var admin = await AsAdminAsync();
        var teacherEmail = UniqueEmail("rakib");
        var ct = await admin.PostAsJsonAsync("/api/admin/teachers", new
        {
            firstName = "Rakib", lastName = "Sir", email = teacherEmail,
            password = StrongPassword, academicLevelId = schoolId
        });
        ct.StatusCode.Should().Be(HttpStatusCode.OK);
        var teacher = await ct.Content.ReadFromJsonAsync<AdminTeacherDto>();

        var assign = await admin.PostAsJsonAsync("/api/teacher-student-subjects", new
        {
            teacherId = teacher!.Id,
            studentId,
            subjectId = subjects["SCH_HMATH"]
        });
        assign.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact(DisplayName = "31_Duplicate_TSS_Rejected")]
    public async Task T31_Duplicate_TSS_Rejected()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, studentId) = await AsRegisteredStudentAsync("Wahid", "Dup", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        var admin = await AsAdminAsync();
        var teacherEmail = UniqueEmail("wajid");
        var ct = await admin.PostAsJsonAsync("/api/admin/teachers", new
        {
            firstName = "Wajid", lastName = "Sir", email = teacherEmail,
            password = StrongPassword, academicLevelId = schoolId
        });
        var teacher = await ct.Content.ReadFromJsonAsync<AdminTeacherDto>();
        var payload = new { teacherId = teacher!.Id, studentId, subjectId = subjects["SCH_PHY"] };
        var first = await admin.PostAsJsonAsync("/api/teacher-student-subjects", payload);
        first.StatusCode.Should().Be(HttpStatusCode.OK);
        var second = await admin.PostAsJsonAsync("/api/teacher-student-subjects", payload);
        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact(DisplayName = "32_Admin_Detail_Lists_AvailableNotSelected_Bucket")]
    public async Task T32_Admin_Detail_Lists_AvailableNotSelected_Bucket()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, studentId) = await AsRegisteredStudentAsync("Xena", "Bucket", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);
        (await student.PostAsJsonAsync("/api/Students/enroll",
            new { subjectId = subjects["SCH_BIO"] })).StatusCode.Should().Be(HttpStatusCode.OK);

        var admin = await AsAdminAsync();
        var detail = await admin.GetFromJsonAsync<AdminStudentDetailDto>(
            $"/api/admin/students/{studentId}");
        detail!.AvailableNotSelectedSubjects.Select(s => s.SubjectCode)
            .Should().BeEquivalentTo(new[] { "SCH_HMATH" });
    }


    [Fact(DisplayName = "33_Teacher_Mine_Returns_Only_Own_Assignments")]
    public async Task T33_Teacher_Mine_Returns_Only_Own_Assignments()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, studentId) = await AsRegisteredStudentAsync("Yusuf", "Mine", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);

        var admin = await AsAdminAsync();
        var teacherEmail = UniqueEmail("yamin");
        var ct = await admin.PostAsJsonAsync("/api/admin/teachers", new
        {
            firstName = "Yamin", lastName = "Sir", email = teacherEmail,
            password = StrongPassword, academicLevelId = schoolId
        });
        var teacher = await ct.Content.ReadFromJsonAsync<AdminTeacherDto>();
        (await admin.PostAsJsonAsync("/api/teacher-student-subjects", new
        {
            teacherId = teacher!.Id, studentId, subjectId = subjects["SCH_PHY"]
        })).StatusCode.Should().Be(HttpStatusCode.OK);

        var teacherClient = Anonymous();
        var login = await teacherClient.PostAsJsonAsync("/api/Auth/login",
            new { email = teacherEmail, password = StrongPassword });
        login.StatusCode.Should().Be(HttpStatusCode.OK);
        teacherClient = await AttachTokenAsync(login);

        var mine = await teacherClient.GetFromJsonAsync<List<TeacherAssignmentDto>>(
            "/api/teacher-student-subjects/mine");
        mine!.Should().HaveCount(1);
        mine[0].StudentId.Should().Be(studentId);
        mine[0].SubjectId.Should().Be(subjects["SCH_PHY"]);
    }

    [Fact(DisplayName = "34_Teacher_Cannot_Create_Assignment_For_Unlinked_Subject")]
    public async Task T34_Teacher_Cannot_Create_Assignment_For_Unlinked_Subject()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, studentId) = await AsRegisteredStudentAsync("Zara", "NoLink", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);

        var admin = await AsAdminAsync();
        var teacherEmail = UniqueEmail("zaheer");
        var ct = await admin.PostAsJsonAsync("/api/admin/teachers", new
        {
            firstName = "Zaheer", lastName = "Sir", email = teacherEmail,
            password = StrongPassword, academicLevelId = schoolId
        });
        var teacher = await ct.Content.ReadFromJsonAsync<AdminTeacherDto>();
        (await admin.PostAsJsonAsync("/api/teacher-student-subjects", new
        {
            teacherId = teacher!.Id, studentId, subjectId = subjects["SCH_PHY"]
        })).StatusCode.Should().Be(HttpStatusCode.OK);

        var teacherClient = Anonymous();
        var login = await teacherClient.PostAsJsonAsync("/api/Auth/login",
            new { email = teacherEmail, password = StrongPassword });
        teacherClient = await AttachTokenAsync(login);

        var resp = await teacherClient.PostAsJsonAsync("/api/assignments", new
        {
            studentId,
            subjectId = subjects["SCH_CHEM"],
            title = "Chapter 1",
            description = "Intro",
            dueDate = DateTime.UtcNow.AddDays(7)
        });
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact(DisplayName = "35_Assignment_Create_Publish_StudentSees")]
    public async Task T35_Assignment_Create_Publish_StudentSees()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, studentId) = await AsRegisteredStudentAsync("Anika", "See", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);

        var admin = await AsAdminAsync();
        var teacherEmail = UniqueEmail("anwar");
        var ct = await admin.PostAsJsonAsync("/api/admin/teachers", new
        {
            firstName = "Anwar", lastName = "Sir", email = teacherEmail,
            password = StrongPassword, academicLevelId = schoolId
        });
        var teacher = await ct.Content.ReadFromJsonAsync<AdminTeacherDto>();
        (await admin.PostAsJsonAsync("/api/teacher-student-subjects", new
        {
            teacherId = teacher!.Id, studentId, subjectId = subjects["SCH_PHY"]
        })).StatusCode.Should().Be(HttpStatusCode.OK);

        var teacherClient = Anonymous();
        var login = await teacherClient.PostAsJsonAsync("/api/Auth/login",
            new { email = teacherEmail, password = StrongPassword });
        teacherClient = await AttachTokenAsync(login);

        var create = await teacherClient.PostAsJsonAsync("/api/assignments", new
        {
            studentId,
            subjectId = subjects["SCH_PHY"],
            title = "Physics Chapter 1",
            description = "Read pp. 1-20",
            dueDate = DateTime.UtcNow.AddDays(7)
        });
        create.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await create.Content.ReadFromJsonAsync<AssignmentDto>();

        var publish = await teacherClient.PostAsJsonAsync(
            $"/api/assignments/{created!.Id}/publish", new { });
        publish.StatusCode.Should().Be(HttpStatusCode.OK);

        var studentList = await student.GetFromJsonAsync<List<AssignmentDto>>("/api/assignments");
        studentList!.Should().Contain(a => a.Id == created.Id && a.IsPublished);
    }

    [Fact(DisplayName = "36_Student_Submits_Teacher_Reviews")]
    public async Task T36_Student_Submits_Teacher_Reviews()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student, studentId) = await AsRegisteredStudentAsync("Babul", "Sub", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student);

        var admin = await AsAdminAsync();
        var teacherEmail = UniqueEmail("badi");
        var ct = await admin.PostAsJsonAsync("/api/admin/teachers", new
        {
            firstName = "Badi", lastName = "Sir", email = teacherEmail,
            password = StrongPassword, academicLevelId = schoolId
        });
        var teacher = await ct.Content.ReadFromJsonAsync<AdminTeacherDto>();
        (await admin.PostAsJsonAsync("/api/teacher-student-subjects", new
        {
            teacherId = teacher!.Id, studentId, subjectId = subjects["SCH_PHY"]
        })).StatusCode.Should().Be(HttpStatusCode.OK);

        var teacherClient = Anonymous();
        var login = await teacherClient.PostAsJsonAsync("/api/Auth/login",
            new { email = teacherEmail, password = StrongPassword });
        teacherClient = await AttachTokenAsync(login);

        var create = await teacherClient.PostAsJsonAsync("/api/assignments", new
        {
            studentId,
            subjectId = subjects["SCH_PHY"],
            title = "Waves",
            description = "Solve Q1-Q5",
            dueDate = DateTime.UtcNow.AddDays(3)
        });
        var created = (await create.Content.ReadFromJsonAsync<AssignmentDto>())!;
        (await teacherClient.PostAsJsonAsync($"/api/assignments/{created.Id}/publish", new { }))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        var submit = await student.PostAsJsonAsync($"/api/assignments/{created.Id}/submit",
            new { submissionText = "My answer: speed of light is 3x10^8 m/s." });
        submit.StatusCode.Should().Be(HttpStatusCode.OK);
        var submitted = (await submit.Content.ReadFromJsonAsync<AssignmentDto>())!;
        submitted.Status.Should().Be("Submitted");
        submitted.SubmissionText.Should().NotBeNullOrEmpty();

        var review = await teacherClient.PostAsJsonAsync($"/api/assignments/{created.Id}/review",
            new { marks = 85m, feedback = "Good attempt. Clarify units." });
        review.StatusCode.Should().Be(HttpStatusCode.OK);
        var reviewed = (await review.Content.ReadFromJsonAsync<AssignmentDto>())!;
        reviewed.Status.Should().Be("Reviewed");
        reviewed.Marks.Should().Be(85m);
        reviewed.Feedback.Should().Contain("Clarify");
    }

    [Fact(DisplayName = "37_Student_Cannot_Submit_For_OtherStudent")]
    public async Task T37_Student_Cannot_Submit_For_OtherStudent()
    {
        var anon = Anonymous();
        var schoolId = await GetSchoolIdAsync(await AsAdminAsync());
        var (student1, studentId1) = await AsRegisteredStudentAsync("Chayan", "First", "Student", schoolId);
        var (student2, _) = await AsRegisteredStudentAsync("Chitra", "Second", "Student", schoolId);
        var subjects = await GetSubjectIdsByCodeAsync(student1);

        var admin = await AsAdminAsync();
        var teacherEmail = UniqueEmail("chayan");
        var ct = await admin.PostAsJsonAsync("/api/admin/teachers", new
        {
            firstName = "Chayan", lastName = "Sir", email = teacherEmail,
            password = StrongPassword, academicLevelId = schoolId
        });
        var teacher = await ct.Content.ReadFromJsonAsync<AdminTeacherDto>();
        (await admin.PostAsJsonAsync("/api/teacher-student-subjects", new
        {
            teacherId = teacher!.Id, studentId = studentId1, subjectId = subjects["SCH_PHY"]
        })).StatusCode.Should().Be(HttpStatusCode.OK);

        var teacherClient = Anonymous();
        var login = await teacherClient.PostAsJsonAsync("/api/Auth/login",
            new { email = teacherEmail, password = StrongPassword });
        teacherClient = await AttachTokenAsync(login);

        var create = await teacherClient.PostAsJsonAsync("/api/assignments", new
        {
            studentId = studentId1,
            subjectId = subjects["SCH_PHY"],
            title = "Vectors",
            description = "Q1-Q3",
            dueDate = DateTime.UtcNow.AddDays(3)
        });
        var created = (await create.Content.ReadFromJsonAsync<AssignmentDto>())!;
        (await teacherClient.PostAsJsonAsync($"/api/assignments/{created.Id}/publish", new { }))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        var resp = await student2.PostAsJsonAsync($"/api/assignments/{created.Id}/submit",
            new { submissionText = "trying" });
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }


    private record AcademicLevelFullDto(string Id, string Code, string Name, bool IsActive);
    private record CurriculumSubjectDto(string CurriculumSubjectId, string SubjectId,
        string SubjectCode, string SubjectName, bool IsCompulsory, string? ElectiveGroup,
        int? MaxChoicesInGroup, string? ElectiveOption);
    private record EnrolledSubjectDto(string SubjectId, string SubjectCode, string SubjectName,
        bool IsCompulsory, string? ElectiveGroup, string? ElectiveOption, DateTime EnrolledAt);
    private record AvailableCurriculumDto(string AcademicLevelId, string AcademicLevelCode,
        string AcademicLevelName, List<CurriculumSubjectDto> CompulsorySubjects,
        List<ElectiveGroupDto> ElectiveGroups, List<CurriculumSubjectDto> AlreadyEnrolled);
    private record AvailableCurriculumWithOptionsDto(string AcademicLevelId, string AcademicLevelCode,
        string AcademicLevelName, List<CurriculumSubjectDto> CompulsorySubjects,
        List<ElectiveGroupDto> ElectiveGroups, List<CurriculumSubjectDto> AlreadyEnrolled);
    private record ElectiveGroupDto(string Name, int MaxChoicesInGroup,
        List<CurriculumSubjectDto> Subjects, List<ElectiveOptionDto> Options);
    private record ElectiveOptionDto(string Key, string DisplayName, List<CurriculumSubjectDto> Subjects);
    private record EnrollmentResponseDto(string SubjectId, string SubjectCode, string SubjectName,
        bool IsCompulsory, string? ElectiveGroup, string? ElectiveOption);
    private record AdminStudentDetailDto(string Id, string FirstName, string LastName, string Email,
        string? PhoneNumber, string Role, string? AcademicLevelId, string? AcademicLevelCode,
        string? AcademicLevelName, bool IsActive, DateTime CreatedAt,
        List<AdminSubjectItemDto> SelectedSubjects,
        List<AdminSubjectItemDto> AvailableNotSelectedSubjects);
    private record AdminSubjectItemDto(string SubjectId, string SubjectCode, string SubjectName,
        bool IsCompulsory, string? ElectiveGroup);
    private record AdminTeacherDto(string Id, string FirstName, string LastName, string Email,
        string? PhoneNumber, string? AcademicLevelId, string? AcademicLevelName,
        bool IsActive, DateTime CreatedAt);
    private record TeacherAssignmentDto(string Id, string TeacherId, string TeacherName,
        string StudentId, string StudentName, string SubjectId, string SubjectName,
        DateTime CreatedAt, bool IsActive);
    private record AssignmentDto(string Id, string TeacherId, string TeacherName, string StudentId,
        string StudentName, string SubjectId, string SubjectName, string Title, string? Description,
        DateTime DueDate, bool IsPublished, bool IsActive, string? SubmissionText, DateTime? SubmittedAt,
        decimal? Marks, string? Feedback, string Status, DateTime CreatedAt, DateTime UpdatedAt);
}