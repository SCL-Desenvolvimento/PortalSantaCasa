using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Services;
using System.Net;
using System.Text.Json;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class TacticalReportsTests
{
    [Theory]
    [InlineData(null, null)]
    [InlineData("https://example.com", null)]
    [InlineData("http://example.com", "test-key")]
    public async Task UnsafeOrMissingConfigurationDoesNotContactRemoteServer(string? url, string? key)
    {
        var handler = new ReportHandler(); using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = Create(handler, cache, url, key);
        var report = await service.GetReportAsync("painel-executivo", null, default);
        Assert.NotNull(report); Assert.False(report.Configured); Assert.Empty(handler.Requests);
        Assert.Null(await service.GetReportAsync("missing-report", null, default));
    }

    [Fact]
    public async Task TacticalRequestsUseConfiguredHostAndKeyAndHandleFailuresWithoutExposingException()
    {
        var handler = new ReportHandler { Status = HttpStatusCode.ServiceUnavailable };
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = Create(handler, cache, "https://example.com", "test-key");
        var result = (await service.GetReportAsync("painel-executivo", null, default))!;
        Assert.True(result.Configured); Assert.NotEmpty(handler.Requests); Assert.Contains("HTTP 503", result.Message);
        Assert.All(handler.Requests, request => { Assert.Equal("example.com", request.Host); Assert.Equal("test-key", request.Key); });
        Assert.Empty(result.Rows);
    }

    [Fact]
    public async Task TacticalValidJsonProducesRowsAndMalformedJsonReturnsControlledError()
    {
        var handler = new ReportHandler { Json = "[{\"hostname\":\"pc1\",\"agent_id\":\"a1\",\"status\":\"online\"}]" };
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var result = (await Create(handler, cache, "https://example.com", "key").GetReportAsync("inventario-maquinas", null, default))!;
        Assert.NotEmpty(result.Rows); Assert.NotEmpty(result.Presentation.Rows); Assert.Null(result.Message);
        handler.Json = "invalid-json";
        result = (await Create(handler, cache, "https://example.com", "key").GetReportAsync("inventario-maquinas", null, default))!;
        Assert.Empty(result.Rows); Assert.Contains("indisponível", result.Message);
    }

    [Fact]
    public void TacticalAnalyzerHandlesEmptyRowsAndBoundsHealthScores()
    {
        var definition = new TacticalReportDefinitionDto("saude-consolidada", "test", "test", "test", "icon", []);
        Assert.Empty(TacticalReportAnalyzer.Analyze(definition, [], null).Rows);
        var row = JsonSerializer.SerializeToElement(new { hostname = "pc", agent_id = "1", status = "offline", checks = new { failing = 100, total = 100 } });
        var result = TacticalReportAnalyzer.Analyze(definition, [row], null);
        Assert.InRange(result.Rows.Single().GetProperty("risk_score").GetInt32(), 0, 100);
        Assert.InRange(result.Rows.Single().GetProperty("health_score").GetInt32(), 0, 100);
    }

    private static TacticalReportsService Create(ReportHandler handler, IMemoryCache cache, string? url, string? key) => new(
        new ReportClientFactory(handler), new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
            ["TacticalRmm:BaseUrl"] = url, ["TacticalRmm:ApiKey"] = key
        }).Build(), NullLogger<TacticalReportsService>.Instance, cache);

    private class ReportClientFactory(ReportHandler handler) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(handler, disposeHandler: false);
    }
    private class ReportHandler : HttpMessageHandler
    {
        public List<(string Host, string Key)> Requests { get; } = [];
        public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;
        public string Json { get; set; } = "[]";
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add((request.RequestUri!.Host, request.Headers.GetValues("X-API-KEY").Single()));
            return Task.FromResult(new HttpResponseMessage(Status) { Content = new StringContent(Json) });
        }
    }
}
