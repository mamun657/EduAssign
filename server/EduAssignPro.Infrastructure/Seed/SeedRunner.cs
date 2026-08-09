using EduAssignPro.Application.Abstractions;
using EduAssignPro.Application.Services;
using EduAssignPro.Domain.Common;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Domain.Enums;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EduAssignPro.Infrastructure.Seed;

public class SeedSettings
{
    /// <summary>If provided, an admin account with this email will be created (idempotent).</summary>
    public string? AdminEmail { get; set; }
    public string? AdminPassword { get; set; }
    public string AdminFirstName { get; set; } = "System";
    public string AdminLastName { get; set; } = "Administrator";
}

public class SeedRunner : ISeedRunner
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IAcademicLevelRepository _levels;
    private readonly ISubjectRepository _subjects;
    private readonly ICurriculumSubjectRepository _curriculum;
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly SeedSettings _settings;
    private readonly ILogger<SeedRunner> _logger;

    public SeedRunner(
        IUnitOfWork unitOfWork,
        IAcademicLevelRepository levels,
        ISubjectRepository subjects,
        ICurriculumSubjectRepository curriculum,
        IUserRepository users,
        IPasswordHasher hasher,
        IOptions<SeedSettings> settings,
        ILogger<SeedRunner> logger)
    {
        _unitOfWork = unitOfWork;
        _levels = levels;
        _subjects = subjects;
        _curriculum = curriculum;
        _users = users;
        _hasher = hasher;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken ct = default)
    {
        _logger.LogInformation("Running idempotent seed...");

        // 1) Indexes (idempotent: MongoDB no-ops if identical index exists)
        await _unitOfWork.EnsureIndexesAsync(ct);

        // 2) Academic levels (Upsert by Code)
        var school = new AcademicLevel
        {
            Code = Constants.SchoolCode,
            Name = "School",
            Description = "Secondary school (Classes 9-12)",
            IsActive = true
        };
        var college = new AcademicLevel
        {
            Code = Constants.CollegeCode,
            Name = "College",
            Description = "Undergraduate college",
            IsActive = true
        };
        await _levels.UpsertByCodeAsync(school, ct);
        await _levels.UpsertByCodeAsync(college, ct);

        var schoolLevel = await _levels.GetByCodeAsync(Constants.SchoolCode, ct);
        var collegeLevel = await _levels.GetByCodeAsync(Constants.CollegeCode, ct);
        if (schoolLevel is null || collegeLevel is null)
        {
            _logger.LogError("Failed to upsert academic levels.");
            return;
        }

        // 3) Subjects (Upsert by Code) - matches the official EduAssign Pro curriculum
        // School: Physics, Chemistry, Bangla, English (compulsory)
        //         Biology OR Higher Mathematics (ScienceOptional, choose exactly 1)
        // College: 1st/2nd Papers of Physics, Chemistry, Bangla, English (compulsory)
        //          Biology 1st/2nd OR Higher Mathematics 1st/2nd (ScienceOptional, choose exactly 1 group)
        var allSubjects = new (string Code, string Name)[]
        {
            // School subjects
            ("SCH_PHY",      "Physics"),
            ("SCH_CHEM",     "Chemistry"),
            ("SCH_BANG",     "Bangla"),
            ("SCH_ENG",      "English"),
            ("SCH_BIO",      "Biology"),
            ("SCH_HMATH",    "Higher Mathematics"),
            // College subjects (1st/2nd Papers)
            ("COL_PHY_1",    "Physics 1st Paper"),
            ("COL_PHY_2",    "Physics 2nd Paper"),
            ("COL_CHEM_1",   "Chemistry 1st Paper"),
            ("COL_CHEM_2",   "Chemistry 2nd Paper"),
            ("COL_BANG_1",   "Bangla 1st Paper"),
            ("COL_BANG_2",   "Bangla 2nd Paper"),
            ("COL_ENG_1",    "English 1st Paper"),
            ("COL_ENG_2",    "English 2nd Paper"),
            ("COL_BIO_1",    "Biology 1st Paper"),
            ("COL_BIO_2",    "Biology 2nd Paper"),
            ("COL_HMATH_1",  "Higher Mathematics 1st Paper"),
            ("COL_HMATH_2",  "Higher Mathematics 2nd Paper")
        };

        foreach (var (code, name) in allSubjects)
        {
            await _subjects.UpsertByCodeAsync(new Subject { Code = code, Name = name, IsActive = true }, ct);
        }

        // Reload subjects to get IDs
        var subjectList = await _subjects.ListAsync(ct);
        var subjByCode = subjectList.ToDictionary(s => s.Code);

        // 4) CurriculumSubjects (Upsert by AcademicLevelId + SubjectId)
        // School: Physics, Chemistry, Bangla, English compulsory;
        //         Biology OR Higher Mathematics (ScienceOptional, MaxChoices=1)
        var schoolCurriculum = new[]
        {
            new { Code = "SCH_PHY",   IsComp = true,  Group = (string?)null,                    Max = (int?)null },
            new { Code = "SCH_CHEM",  IsComp = true,  Group = (string?)null,                    Max = (int?)null },
            new { Code = "SCH_BANG",  IsComp = true,  Group = (string?)null,                    Max = (int?)null },
            new { Code = "SCH_ENG",   IsComp = true,  Group = (string?)null,                    Max = (int?)null },
            new { Code = "SCH_BIO",   IsComp = false, Group = (string?)Constants.ScienceOptionalGroup, Max = (int?)1 },
            new { Code = "SCH_HMATH", IsComp = false, Group = (string?)Constants.ScienceOptionalGroup, Max = (int?)1 }
        };

        foreach (var item in schoolCurriculum)
        {
            if (!subjByCode.TryGetValue(item.Code, out var subj)) continue;
            await _curriculum.UpsertAsync(new CurriculumSubject
            {
                AcademicLevelId = schoolLevel.Id,
                SubjectId = subj.Id,
                IsCompulsory = item.IsComp,
                ElectiveGroup = item.Group,
                MaxChoicesInGroup = item.Max,
                IsActive = true
            }, ct);
        }

        // College: Physics 1st/2nd, Chemistry 1st/2nd, Bangla 1st/2nd, English 1st/2nd compulsory;
        //          Biology 1st/2nd group OR Higher Mathematics 1st/2nd group (ScienceOptional, choose ONE option).
        //          Each option has 2 papers that auto-enroll together.
        var collegeCurriculum = new[]
        {
            new { Code = "COL_PHY_1",   IsComp = true,  Group = (string?)null,                         Max = (int?)null, Option = (string?)null },
            new { Code = "COL_PHY_2",   IsComp = true,  Group = (string?)null,                         Max = (int?)null, Option = (string?)null },
            new { Code = "COL_CHEM_1",  IsComp = true,  Group = (string?)null,                         Max = (int?)null, Option = (string?)null },
            new { Code = "COL_CHEM_2",  IsComp = true,  Group = (string?)null,                         Max = (int?)null, Option = (string?)null },
            new { Code = "COL_BANG_1",  IsComp = true,  Group = (string?)null,                         Max = (int?)null, Option = (string?)null },
            new { Code = "COL_BANG_2",  IsComp = true,  Group = (string?)null,                         Max = (int?)null, Option = (string?)null },
            new { Code = "COL_ENG_1",   IsComp = true,  Group = (string?)null,                         Max = (int?)null, Option = (string?)null },
            new { Code = "COL_ENG_2",   IsComp = true,  Group = (string?)null,                         Max = (int?)null, Option = (string?)null },
            new { Code = "COL_BIO_1",   IsComp = false, Group = (string?)Constants.ScienceOptionalGroup, Max = (int?)2,    Option = (string?)"Biology" },
            new { Code = "COL_BIO_2",   IsComp = false, Group = (string?)Constants.ScienceOptionalGroup, Max = (int?)2,    Option = (string?)"Biology" },
            new { Code = "COL_HMATH_1", IsComp = false, Group = (string?)Constants.ScienceOptionalGroup, Max = (int?)2,    Option = (string?)"HigherMathematics" },
            new { Code = "COL_HMATH_2", IsComp = false, Group = (string?)Constants.ScienceOptionalGroup, Max = (int?)2,    Option = (string?)"HigherMathematics" }
        };

        foreach (var item in collegeCurriculum)
        {
            if (!subjByCode.TryGetValue(item.Code, out var subj)) continue;
            await _curriculum.UpsertAsync(new CurriculumSubject
            {
                AcademicLevelId = collegeLevel.Id,
                SubjectId = subj.Id,
                IsCompulsory = item.IsComp,
                ElectiveGroup = item.Group,
                MaxChoicesInGroup = item.Max,
                ElectiveOption = item.Option,
                IsActive = true
            }, ct);
        }

        // 5) Optional Admin user (idempotent)
        if (!string.IsNullOrWhiteSpace(_settings.AdminEmail) && !string.IsNullOrWhiteSpace(_settings.AdminPassword))
        {
            var email = _settings.AdminEmail.Trim().ToLowerInvariant();
            if (!await _users.EmailExistsAsync(email, ct))
            {
                await _users.InsertAsync(new User
                {
                    FirstName = _settings.AdminFirstName,
                    LastName = _settings.AdminLastName,
                    Email = email,
                    PasswordHash = _hasher.Hash(_settings.AdminPassword),
                    Role = Role.Admin,
                    IsActive = true
                }, ct);
                _logger.LogInformation("Admin user '{Email}' created.", email);
            }
        }

        _logger.LogInformation("Seed complete.");
    }
}
