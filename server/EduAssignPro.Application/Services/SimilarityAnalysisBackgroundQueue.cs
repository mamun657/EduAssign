using System.Threading.Channels;
using EduAssignPro.Application.Abstractions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace EduAssignPro.Application.Services;

/// <summary>
/// Phase 6: Bounded background queue that runs similarity analysis off the request thread.
/// </summary>
public class SimilarityAnalysisBackgroundQueue : BackgroundService
{
    private readonly Channel<string> _queue;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SimilarityAnalysisBackgroundQueue> _logger;

    public SimilarityAnalysisBackgroundQueue(IServiceProvider serviceProvider, ILogger<SimilarityAnalysisBackgroundQueue> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _queue = Channel.CreateBounded<string>(new BoundedChannelOptions(1024)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = true,
            SingleWriter = false
        });
    }

    public bool TryEnqueue(string submissionId)
    {
        if (string.IsNullOrWhiteSpace(submissionId)) return false;
        if (_queue.Writer.TryWrite(submissionId)) return true;
        _logger.LogWarning("Similarity queue is full; dropping submission {Sub}", submissionId);
        return false;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SimilarityAnalysisBackgroundQueue started.");
        await foreach (var submissionId in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var svc = scope.ServiceProvider.GetRequiredService<SimilarityAnalysisService>();
                await svc.RunAnalysisAsync(submissionId, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background similarity analysis failed for submission {Sub}", submissionId);
            }
        }
        _logger.LogInformation("SimilarityAnalysisBackgroundQueue stopped.");
    }
}
