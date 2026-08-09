using System.Text.RegularExpressions;
using EduAssignPro.Application.Abstractions;
using EduAssignPro.Application.Dtos.Auth;
using EduAssignPro.Application.Exceptions;
using EduAssignPro.Domain.Common;
using EduAssignPro.Domain.Entities;
using EduAssignPro.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace EduAssignPro.Application.Services;

public partial class AuthService
{
    private readonly IUserRepository _users;
    private readonly IAcademicLevelRepository _academicLevels;
    private readonly ICurriculumSubjectRepository _curriculumSubjects;
    private readonly IStudentEnrollmentRepository _enrollments;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly ICurrentUser _currentUser;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        IUserRepository users,
        IAcademicLevelRepository academicLevels,
        ICurriculumSubjectRepository curriculumSubjects,
        IStudentEnrollmentRepository enrollments,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        ICurrentUser currentUser,
        ILogger<AuthService> logger)
    {
        _users = users;
        _academicLevels = academicLevels;
        _curriculumSubjects = curriculumSubjects;
        _enrollments = enrollments;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _currentUser = currentUser;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        ValidateRegistrationRequest(request);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await _users.EmailExistsAsync(normalizedEmail, ct))
            throw new ConflictException("An account with this email already exists.");

        var role = ParseRole(request.Role);

        string? academicLevelId = null;
        if (role == Role.Student)
        {
            if (string.IsNullOrWhiteSpace(request.AcademicLevelId))
                throw new ValidationException("Academic level is required for Student registration.");

            var level = await _academicLevels.GetByIdAsync(request.AcademicLevelId, ct)
                ?? throw new ValidationException("Selected academic level does not exist.");

            if (!level.IsActive)
                throw new ValidationException("Selected academic level is not active.");

            if (level.Code != Constants.SchoolCode && level.Code != Constants.CollegeCode)
                throw new ValidationException("Academic level must be School or College.");

            academicLevelId = level.Id;
        }
        else if (role == Role.Teacher)
        {
            if (!string.IsNullOrWhiteSpace(request.AcademicLevelId))
            {
                var level = await _academicLevels.GetByIdAsync(request.AcademicLevelId, ct)
                    ?? throw new ValidationException("Selected academic level does not exist.");
                academicLevelId = level.Id;
            }
        }
        else if (role == Role.Admin)
        {
            throw new ValidationException("Admin role cannot register publicly.");
        }

        var user = new User
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = normalizedEmail,
            PasswordHash = _passwordHasher.Hash(request.Password),
            PhoneNumber = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim(),
            Role = role,
            AcademicLevelId = academicLevelId,
            IsActive = true
        };

        await _users.InsertAsync(user, ct);

        // Auto-enroll compulsory subjects if Student
        if (role == Role.Student && academicLevelId is not null)
        {
            var curriculum = await _curriculumSubjects.ListByAcademicLevelAsync(academicLevelId, ct);
            var compulsory = curriculum.Where(c => c.IsCompulsory).ToList();
            foreach (var cs in compulsory)
            {
                var existing = await _enrollments.GetAsync(user.Id, cs.SubjectId, ct);
                if (existing is null)
                {
                    await _enrollments.InsertAsync(new StudentSubjectEnrollment
                    {
                        StudentId = user.Id,
                        SubjectId = cs.SubjectId,
                        CurriculumSubjectId = cs.Id,
                        EnrolledAt = DateTime.UtcNow,
                        IsActive = true
                    }, ct);
                }
            }
        }

        var token = _tokenService.CreateToken(user.Id, user.Email, user.Role.ToString());
        _logger.LogInformation("User {Email} registered with role {Role}", user.Email, user.Role);

        return new AuthResponse(token, ToUserResponse(user));
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            throw new ValidationException("Email and password are required.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _users.GetByEmailAsync(normalizedEmail, ct)
            ?? throw new UnauthorizedException("Invalid email or password.");

        if (!user.IsActive)
            throw new UnauthorizedException("Account is deactivated.");

        if (!_passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException("Invalid email or password.");

        var token = _tokenService.CreateToken(user.Id, user.Email, user.Role.ToString());
        _logger.LogInformation("User {Email} logged in", user.Email);

        return new AuthResponse(token, ToUserResponse(user));
    }

    public async Task<UserResponse> GetCurrentUserAsync(CancellationToken ct = default)
    {
        if (!_currentUser.IsAuthenticated || string.IsNullOrEmpty(_currentUser.UserId))
            throw new UnauthorizedException();

        var user = await _users.GetByIdAsync(_currentUser.UserId, ct)
            ?? throw new NotFoundException("User not found.");

        return ToUserResponse(user);
    }

    private static void ValidateRegistrationRequest(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName))
            throw new ValidationException("First name is required.");
        if (string.IsNullOrWhiteSpace(request.LastName))
            throw new ValidationException("Last name is required.");
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ValidationException("Email is required.");
        if (!EmailRegex().IsMatch(request.Email))
            throw new ValidationException("Email format is invalid.");
        if (string.IsNullOrWhiteSpace(request.Password))
            throw new ValidationException("Password is required.");
        if (request.Password.Length < 8)
            throw new ValidationException("Password must be at least 8 characters.");
        if (!PasswordStrengthRegex().IsMatch(request.Password))
            throw new ValidationException("Password must contain uppercase, lowercase, number, and special character.");
        if (request.Password != request.ConfirmPassword)
            throw new ValidationException("Passwords do not match.");
        if (string.IsNullOrWhiteSpace(request.Role))
            throw new ValidationException("Role is required.");
    }

    private static Role ParseRole(string roleString)
    {
        if (Enum.TryParse<Role>(roleString, ignoreCase: true, out var role))
        {
            if (role == Role.Admin)
                throw new ValidationException("Admin role cannot register publicly.");
            return role;
        }
        throw new ValidationException("Role must be Student or Teacher.");
    }

    private static UserResponse ToUserResponse(User user) =>
        new(user.Id, user.FirstName, user.LastName, user.Email, user.PhoneNumber,
            user.Role.ToString(), user.AcademicLevelId, user.IsActive, user.CreatedAt);

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex EmailRegex();

    [GeneratedRegex(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$",
        RegexOptions.Compiled)]
    private static partial Regex PasswordStrengthRegex();
}
