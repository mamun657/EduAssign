using System.Text;
using EduAssignPro.Api.Middleware;
using EduAssignPro.Application;
using EduAssignPro.Application.Abstractions;
using EduAssignPro.Application.Configuration;
using EduAssignPro.Application.Services;
using EduAssignPro.Infrastructure;
using EduAssignPro.Infrastructure.Mongo;
using EduAssignPro.Infrastructure.Security;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

static string? FindEnvFile(string startDir)
{
    var dir = new DirectoryInfo(startDir);
    while (dir != null)
    {
        var candidate = Path.Combine(dir.FullName, ".env");
        if (File.Exists(candidate)) return candidate;
        dir = dir.Parent;
    }
    return null;
}

string? loadedEnvPath = null;
try
{
    var envPath = FindEnvFile(builder.Environment.ContentRootPath);
    if (envPath != null)
    {
        var envDict = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        foreach (var line in File.ReadAllLines(envPath))
        {
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;
            var idx = line.IndexOf('=');
            if (idx <= 0) continue;
            var rawKey = line[..idx].Trim();
            var value = line[(idx + 1)..].Trim();
            if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable(rawKey))) continue;
            var configKey = rawKey.Replace("__", ":");
            envDict[configKey] = value;
            Environment.SetEnvironmentVariable(rawKey, value);
        }
        builder.Configuration.AddInMemoryCollection(envDict);
        loadedEnvPath = envPath;
        Log.Information("Loaded .env from {EnvPath} ({Count} entries)", envPath, envDict.Count);
    }
    else
    {
        Log.Warning(".env file not found by walking upward from {StartDir}", builder.Environment.ContentRootPath);
    }
}
catch (Exception ex)
{
    Log.Warning(ex, "Failed to load .env file");
}

var mongoConnSet = !string.IsNullOrWhiteSpace(builder.Configuration["Mongo:ConnectionString"]);
var mongoDbSet   = !string.IsNullOrWhiteSpace(builder.Configuration["Mongo:DatabaseName"]);
var jwtSecretSet = !string.IsNullOrWhiteSpace(builder.Configuration["Jwt:Secret"]);
var seedEmailSet = !string.IsNullOrWhiteSpace(builder.Configuration["Seed:AdminEmail"]);
var seedPwdSet   = !string.IsNullOrWhiteSpace(builder.Configuration["Seed:AdminPassword"]);
Log.Information("Mongo connection string loaded: {MongoConn}", mongoConnSet ? "YES" : "NO");
Log.Information("Mongo database name: {MongoDb}", mongoDbSet ? builder.Configuration["Mongo:DatabaseName"] : "NOT_SET");
Log.Information("JWT secret loaded: {Jwt}", jwtSecretSet ? "YES" : "NO");
Log.Information("Admin seed email loaded: {SeedEmail}", seedEmailSet ? "YES" : "NO");
Log.Information("Admin seed password loaded: {SeedPwd}", seedPwdSet ? "YES" : "NO");

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHttpContextAccessor();

builder.Services.Configure<SimilarityOptions>(builder.Configuration.GetSection(SimilarityOptions.SectionName));
builder.Services.AddHttpClient<IMlClient, SimilarityMlClient>();
builder.Services.AddSingleton<SimilarityAnalysisBackgroundQueue>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<SimilarityAnalysisBackgroundQueue>());

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret not configured");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "EduAssignPro";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "EduAssignPro.Client";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.FromMinutes(1),
            RoleClaimType = System.Security.Claims.ClaimTypes.Role
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "EduAssign Pro API",
        Version = "v1",
        Description = "Recruitment assignment management system"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

void FailStartup(string problem)
{
    Log.Fatal(problem);
    Log.Fatal("Required database configuration is missing or initialization failed.");
    Log.Fatal("Application is NOT starting the HTTP server. Fix the .env and retry.");
    Log.CloseAndFlush();
    Environment.ExitCode = 2;
    throw new InvalidOperationException(problem);
}

if (string.IsNullOrWhiteSpace(builder.Configuration["Mongo:ConnectionString"]))
{
    FailStartup("Mongo:ConnectionString is not configured (.env not found or missing key).");
}

if (string.IsNullOrWhiteSpace(builder.Configuration["Jwt:Secret"]))
{
    FailStartup("Jwt:Secret is not configured (.env not found or missing key).");
}

using (var scope = app.Services.CreateScope())
{
    try
    {
        var seed = scope.ServiceProvider.GetRequiredService<ISeedRunner>();
        await seed.SeedAsync();
        Log.Information("Seed completed successfully.");
    }
    catch (Exception ex)
    {
        FailStartup($"Database initialization/seed failed: {ex.Message}");
    }
}

app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSerilogRequestLogging();

var corsOrigins = builder.Configuration["Cors:AllowedOrigins"]?.Split(
    ',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
if (builder.Environment.IsDevelopment())
{
    var devOrigins = new List<string> { "http://localhost:3000" };
    if (corsOrigins is { Length: > 0 }) devOrigins.AddRange(corsOrigins);
    app.UseCors(p => p.WithOrigins(devOrigins.ToArray())
        .AllowAnyHeader()
        .AllowAnyMethod());
}
else if (corsOrigins is { Length: > 0 })
{
    app.UseCors(p => p.WithOrigins(corsOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod());
}
else
{
    app.UseCors(p => p.WithOrigins(Array.Empty<string>()));
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    Log.Information("Binding to 0.0.0.0:{Port} from PORT env var", port);
    app.Urls.Clear();
    app.Urls.Add($"http://0.0.0.0:{port}");
}

app.Run();

public partial class Program { }
