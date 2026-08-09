using System.Net;
using System.Text.Json;
using EduAssignPro.Application.Exceptions;

namespace EduAssignPro.Api.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (AppException ex)
        {
            _logger.LogWarning(ex, "AppException: {Code} {Message}", ex.Code, ex.Message);
            await WriteAsync(context, ex.StatusCode, ex.Code, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            var msg = _env.IsDevelopment() ? ex.Message : "An unexpected error occurred.";
            await WriteAsync(context, (int)HttpStatusCode.InternalServerError, "INTERNAL_ERROR", msg);
        }
    }

    private static async Task WriteAsync(HttpContext ctx, int status, string code, string message)
    {
        if (ctx.Response.HasStarted) return;
        ctx.Response.Clear();
        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/json";
        var payload = JsonSerializer.Serialize(new
        {
            success = false,
            code,
            message
        });
        await ctx.Response.WriteAsync(payload);
    }
}