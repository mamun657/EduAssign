using System.Net.Http.Json;

namespace EduAssignPro.Tests.Infrastructure;

/// <summary>
/// Static helpers for tests: shared password policy, unique email generator,
/// and AcademicLevel lookup helpers.
/// </summary>
public static class TestData
{
    /// <summary>
    /// Strong password that satisfies the API's strength regex:
    /// at least 8 chars, uppercase, lowercase, digit, special.
    /// </summary>
    public const string StrongPassword = "Passw0rd!_Aa1";

    public static string UniqueEmail(string prefix) =>
        $"{prefix}-{Guid.NewGuid():N}@test.local".ToLowerInvariant();

    public static async Task<string> GetSchoolIdAsync(HttpClient authedClient)
    {
        var levels = await authedClient.GetFromJsonAsync<List<AcademicLevelDto>>("/api/AcademicLevels");
        return levels!.First(l => l.Code == "SCHOOL").Id;
    }

    public static async Task<string> GetCollegeIdAsync(HttpClient authedClient)
    {
        var levels = await authedClient.GetFromJsonAsync<List<AcademicLevelDto>>("/api/AcademicLevels");
        return levels!.First(l => l.Code == "COLLEGE").Id;
    }

    public static async Task<Dictionary<string, string>> GetSubjectIdsByCodeAsync(HttpClient authedClient)
    {
        var subjects = await authedClient.GetFromJsonAsync<List<SubjectDto>>("/api/Subjects");
        return subjects!.ToDictionary(s => s.Code, s => s.Id);
    }

    public record AcademicLevelDto(string Id, string Code, string Name, bool IsActive);
    public record SubjectDto(string Id, string Code, string Name, bool IsActive);
}

