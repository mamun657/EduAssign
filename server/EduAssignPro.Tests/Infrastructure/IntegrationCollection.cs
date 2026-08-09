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
        // MongoDB database names are limited to 38 bytes. We use "Test_" (5 chars)
        // + the first 16 hex chars of a fresh GUID = 21 chars total, well under
        // the limit and still unique per test run.
        var dbName = $"Test_{Guid.NewGuid():N}".Substring(0, 21);
        Factory = new TestAppFactory(dbName);
        // Force the host to start so the seed runs.
        _ = Factory.CreateClient();
        return Task.CompletedTask;
    }

    public async Task DisposeAsync()
    {
        try
        {
            await Factory.DropDatabaseAsync();
        }
        catch { /* best-effort cleanup */ }
        Factory.Dispose();
    }
}
