using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using PortalSantaCasa.Server.Services;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class RhEmployeeDirectoryTests
{
    private readonly RhEmployeeDirectory directory = new(new ConfigurationBuilder().Build(), NullLogger<RhEmployeeDirectory>.Instance);

    [Theory]
    [InlineData("")]
    [InlineData("abc")]
    [InlineData("05520' OR 1=1")]
    public async Task InvalidChapaIsRejectedBeforeConnecting(string chapa)
        => await Assert.ThrowsAsync<ArgumentException>(() => directory.FindAsync(chapa));

    [Fact]
    public async Task MissingConnectionIsReportedAsUnavailable()
        => await Assert.ThrowsAsync<EmployeeDirectoryUnavailableException>(() => directory.FindAsync("05520"));
}
