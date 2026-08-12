using EduAssignPro.Application.Abstractions;
using EduAssignPro.Application.Services;
using EduAssignPro.Infrastructure.Mongo;
using EduAssignPro.Infrastructure.Repositories;
using EduAssignPro.Infrastructure.Security;
using EduAssignPro.Infrastructure.Seed;
using EduAssignPro.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EduAssignPro.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Bind settings
        services.Configure<MongoSettings>(configuration.GetSection("Mongo"));
        services.Configure<JwtSettings>(configuration.GetSection("Jwt"));
        services.Configure<SeedSettings>(configuration.GetSection("Seed"));

        // Mongo
        services.AddSingleton<MongoContext>();

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IAcademicLevelRepository, AcademicLevelRepository>();
        services.AddScoped<ISubjectRepository, SubjectRepository>();
        services.AddScoped<ICurriculumSubjectRepository, CurriculumSubjectRepository>();
        services.AddScoped<IStudentEnrollmentRepository, StudentEnrollmentRepository>();
        services.AddScoped<ITeacherStudentSubjectRepository, TeacherStudentSubjectRepository>();
        services.AddScoped<IAssignmentRepository, AssignmentRepository>();
        services.AddScoped<ISimilarityAnalysisRepository, SimilarityAnalysisRepository>();
        services.AddSingleton<ITextExtractor, PdfTextExtractor>();
        services.AddScoped<IFileRepository, GridFsFileRepository>(sp =>
        {
            var ctx = sp.GetRequiredService<MongoContext>();
            return new GridFsFileRepository(ctx.Database);
        });
        services.AddScoped<IUnitOfWork, MongoIndexInitializer>();

        // Security
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddScoped<ICurrentUser, HttpContextCurrentUser>();

        services.AddScoped<ISeedRunner, SeedRunner>();

        return services;
    }
}
