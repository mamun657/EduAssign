using Xunit;

namespace EduAssignPro.Tests.Infrastructure;

/// <summary>
/// All 37 integration tests share a single TestAppFactory + isolated database
/// so the seed runs once. The database is dropped on dispose.
/// </summary>
[CollectionDefinition("Integration")]
public class IntegrationCollection : ICollectionFixture<IntegrationFixture>
{
}

public class IntegrationFixture : IAsyncLifetime
{
    public TestAppFactory Factory { get; private set; } = null!;

    public Task InitializeAsync()
    {
        var dbName = $"Test_{Guid.NewGuid():N}".Substring(0, 21);
        Factory = new TestAppFactory(dbName);
        _ = Factory.CreateClient();
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        try
        {
            await Factory.DropDatabaseAsync();
        }
        catch {  }
        Factory.Dispose();
    }
}
