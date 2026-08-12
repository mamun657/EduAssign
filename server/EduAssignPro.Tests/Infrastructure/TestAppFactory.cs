using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using EduAssignPro.Infrastructure.Mongo;

namespace EduAssignPro.Tests.Infrastructure;

/// <summary>
/// Builds an isolated WebApplicationFactory for each test class collection.
/// The DB name is unique per factory instance so tests never collide with the
/// real EduAssignPro development database. The connection string is sourced
/// from the .env file at the repo root (discovered by walking upward from the
/// app's content root) — we never fall back to the dev DB if the config is
/// missing.
/// </summary>
public class TestAppFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName;

    public TestAppFactory(string databaseName)
    {
        _databaseName = databaseName;
    }

    public string DatabaseName => _databaseName;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((ctx, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Mongo:DatabaseName"] = _databaseName,
                ["Logging:LogLevel:Default"] = "Warning",
                ["Serilog:MinimumLevel:Default"] = "Warning"
            });
        });

        builder.UseEnvironment("Testing");
    }

    public async Task<HttpClient> CreateAuthedClientAsync(string email, string password)
    {
        var client = CreateClient();
        var resp = await client.PostAsJsonAsync("/api/Auth/login", new { email, password });
        resp.EnsureSuccessStatusCode();
        var payload = await resp.Content.ReadFromJsonAsync<LoginResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", payload!.Token);
        return client;
    }

    public async Task DropDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var ctx = scope.ServiceProvider.GetRequiredService<MongoContext>();
        await ctx.Database.Client.DropDatabaseAsync(_databaseName);
    }

    private record LoginResponse(string Token, object User);
}
