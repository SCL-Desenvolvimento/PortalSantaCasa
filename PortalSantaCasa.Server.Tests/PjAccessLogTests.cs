using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Services;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class PjAccessLogTests
{
    [Fact]
    public void SnapshotMatchesCurrentMySqlModelWithoutConnecting()
    {
        using var db = new PortalSantaCasaDbContext(new DbContextOptionsBuilder<PortalSantaCasaDbContext>()
            .UseMySQL("Server=localhost;Database=portal;User=test;Password=test").Options);
        Assert.True(db.GetService<IMigrationsAssembly>().ModelSnapshot is not null,
            "O snapshot deve estar versionado no Git para ser incluído na compilação da esteira.");
        Assert.False(db.Database.HasPendingModelChanges());
    }

    [Theory]
    [InlineData("529.982.247-25", "52998224725")]
    [InlineData("01234567890", "01234567890")]
    public void CpfIsNormalizedWithoutLosingLeadingZeros(string input, string expected)
        => Assert.Equal(expected, AccessIdentity.NormalizeCpf(input));

    [Theory]
    [InlineData("")]
    [InlineData("11111111111")]
    [InlineData("52998224724")]
    [InlineData("5299822472A")]
    [InlineData("123")]
    public async Task InvalidCpfIsRejectedBeforeOracleConnection(string cpf)
    {
        var directory = new OraclePjDirectory(new ConfigurationBuilder().Build(), NullLogger<OraclePjDirectory>.Instance);
        await Assert.ThrowsAsync<ArgumentException>(() => directory.FindAsync(cpf));
    }

    [Fact]
    public async Task PjUsesOracleIdentityAndReportFiltersPreserveCltHistory()
    {
        using var db = TestSupport.Database();
        db.PublicAccessLogs.Add(new() { Name = "CLT", RE = "1", Sector = "TI", Page = "noticias" });
        await db.SaveChangesAsync();
        var contractors = new Contractors();
        var service = new PublicAccessLogService(db, new UnexpectedRh(), contractors);
        var result = await service.CreateAsync(new() { EmploymentType = "PJ", RE = "529.982.247-25",
            Name = "Forged", Sector = "Forged", Page = "noticias", ContentId = 7, ContentTitle = "Notícia" }, null, "");
        Assert.Equal("52998224725", contractors.Cpf);
        Assert.Equal("52998224725", result.RE);
        Assert.Equal("PJ", result.EmploymentType);
        Assert.Equal("Prestador", result.Name);
        Assert.Equal("Prestador PJ", result.Sector);
        var pj = await service.GetReportAsync(new() { EmploymentType = "PJ", ContentId = 7, PageType = "noticias" });
        Assert.Equal("PJ", Assert.Single(pj.Logs).EmploymentType);
        Assert.Equal("CLT", Assert.Single((await service.GetReportAsync(new() { EmploymentType = "CLT" })).Logs).EmploymentType);
    }

    [Fact]
    public async Task UnknownCpfAndOracleFailureDoNotAllowForgedManualRegistration()
    {
        using var db = TestSupport.Database();
        var contractors = new Contractors();
        var service = new PublicAccessLogService(db, new UnexpectedRh(), contractors);
        var dto = new PublicAccessLogCreateDto { EmploymentType = "PJ", RE = "52998224725", Page = "noticias", Name = "Manual", Sector = "TI" };
        contractors.Missing = true;
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(dto, null, ""));
        contractors.Unavailable = true;
        await Assert.ThrowsAsync<EmployeeDirectoryUnavailableException>(() => service.CreateAsync(dto, null, ""));
        dto.EmploymentType = "OUTRO";
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateAsync(dto, null, ""));
        Assert.Empty(db.PublicAccessLogs);
    }

    private sealed class UnexpectedRh : IEmployeeDirectory
    {
        public Task<EmployeeIdentityDto?> FindAsync(string chapa, CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("PJ must not query RH.");
    }

    private sealed class Contractors : IPjDirectory
    {
        public string? Cpf { get; private set; }
        public bool Missing { get; set; }
        public bool Unavailable { get; set; }
        public Task<EmployeeIdentityDto?> FindAsync(string cpf, CancellationToken cancellationToken = default)
        {
            Cpf = cpf;
            if (Unavailable) throw new EmployeeDirectoryUnavailableException();
            return Task.FromResult<EmployeeIdentityDto?>(Missing ? null : new(cpf, "Prestador", "Prestador PJ"));
        }
    }
}
