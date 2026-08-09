namespace EduAssignPro.Application.Services;

public interface ISeedRunner
{
    Task SeedAsync(CancellationToken ct = default);
}