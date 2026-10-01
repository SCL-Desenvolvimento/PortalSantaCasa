using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Services;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class PublicLogsAndFormsTests
{
    [Theory]
    [InlineData("notícia", "noticias")]
    [InlineData("Notícias", "noticias")]
    [InlineData("comunicado", "comunicados")]
    [InlineData("Minuto de Qualidade", "qualidade")]
    public async Task PublicLogsNormalizeAliasesAndPreserveContentTitles(string page, string normalized)
    {
        using var db = TestSupport.Database(); var service = new PublicAccessLogService(db);
        var result = await service.CreateAsync(new PublicAccessLogCreateDto { Name = " Person ", RE = " 1 ", Sector = " TI ", Page = page,
            ContentId = 7, ContentTitle = "Title::subtitle" }, "127.0.0.1", "test-agent");
        Assert.Equal(normalized, result.Page); Assert.Equal("Title::subtitle", result.ContentTitle);
        Assert.Equal(7, result.ContentId); Assert.Equal("Person", result.Name); Assert.Equal("127.0.0.1", result.IpAddress);
        var report = await service.GetReportAsync(new PublicAccessLogReportQueryDto { PageType = normalized, ContentId = 7, Sector = "TI", PerPage = 1 });
        Assert.Equal(1, report.Total); Assert.Single(report.Logs);
        Assert.Empty((await service.GetReportAsync(new PublicAccessLogReportQueryDto { Sector = "RH" })).Logs);
    }

    [Fact]
    public async Task ReportFiltersDatesAndNormalizesInvalidPagination()
    {
        using var db = TestSupport.Database(); var now = DateTimeOffset.UtcNow;
        db.PublicAccessLogs.AddRange(new PublicAccessLog { Name = "old", RE = "1", Sector = "TI", Page = "noticias", AccessedAt = now.AddDays(-2) },
            new PublicAccessLog { Name = "new", RE = "2", Sector = "TI", Page = "noticias", AccessedAt = now });
        await db.SaveChangesAsync(); var service = new PublicAccessLogService(db);
        var result = await service.GetReportAsync(new PublicAccessLogReportQueryDto { CurrentPage = -1, PerPage = 0, StartDate = now.AddHours(-1), EndDate = now.AddHours(1) });
        Assert.Equal(1, result.CurrentPage); Assert.Equal(1, result.PerPage); Assert.Equal("new", result.Logs.Single().Name);
        Assert.Equal(10000, (await service.GetReportAsync(new PublicAccessLogReportQueryDto { PerPage = int.MaxValue })).PerPage);
        await Assert.ThrowsAsync<ArgumentException>(() => service.GetContentOptionsAsync("unknown"));
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(new PublicAccessLogCreateDto(), null, ""));
    }

    [Fact]
    public async Task FormsCrudPersistsAndHandlesMissingIds()
    {
        using var db = TestSupport.Database(); var service = new FormsService(db);
        var created = await service.CreateAsync(new FormsCreateDto { Title = "form", Description = "description", FormsLink = "https://example.com" });
        Assert.Single(await service.GetAllAsync()); Assert.NotNull(await service.GetByIdAsync(created.Id));
        Assert.Equal("updated", (await service.UpdateAsync(created.Id, new FormsUpdateDto { Title = "updated" }))!.Title);
        Assert.Null(await service.GetByIdAsync(999)); Assert.Null(await service.UpdateAsync(999, new FormsUpdateDto()));
        Assert.True(await service.DeleteAsync(created.Id)); Assert.False(await service.DeleteAsync(created.Id));
        Assert.Empty(await service.GetAllAsync());
    }
}
