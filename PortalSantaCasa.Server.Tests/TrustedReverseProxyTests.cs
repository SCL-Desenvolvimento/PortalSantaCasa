using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class TrustedReverseProxyTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task OnlyConfiguredGatewayCanForwardClientAddressAndScheme(bool realtime)
    {
        var options = Configure(realtime, "172.28.0.2");
        foreach (var source in new[] { "172.28.0.2", "::ffff:172.28.0.2", "172.28.0.3", "127.0.0.1" })
        {
            var context = new DefaultHttpContext();
            context.Connection.RemoteIpAddress = IPAddress.Parse(source);
            context.Request.Scheme = "http";
            context.Request.Headers["X-Forwarded-For"] = "198.51.100.8, 203.0.113.7";
            context.Request.Headers["X-Forwarded-Proto"] = "https";
            var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance, Options.Create(options));
            await middleware.Invoke(context);
            var trusted = source.EndsWith("172.28.0.2", StringComparison.Ordinal);
            Assert.Equal(trusted ? "https" : "http", context.Request.Scheme);
            Assert.Equal(trusted ? "203.0.113.7" : source, context.Connection.RemoteIpAddress!.ToString());
        }
    }

    [Theory]
    [InlineData("not-an-ip")]
    [InlineData("0.0.0.0")]
    [InlineData("172.28.0.2/16")]
    public void InvalidConfiguredProxyFailsClearly(string value)
    {
        foreach (var realtime in new[] { false, true })
        {
            var error = Assert.Throws<InvalidOperationException>(() => Configure(realtime, value));
            Assert.Contains("ReverseProxy:KnownProxy", error.Message);
        }
    }

    [Fact]
    public void MissingConfigurationRetainsRestrictedFrameworkDefaults()
    {
        foreach (var realtime in new[] { false, true })
        {
            var options = Configure(realtime, null);
            Assert.NotEmpty(options.KnownProxies);
            Assert.Equal(1, options.ForwardLimit);
        }
    }

    private static ForwardedHeadersOptions Configure(bool realtime, string? value)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["ReverseProxy:KnownProxy"] = value }).Build();
        var options = new ForwardedHeadersOptions();
        if (realtime) PortalSantaCasa.Realtime.Security.TrustedReverseProxy.Configure(options, configuration);
        else PortalSantaCasa.Server.Security.TrustedReverseProxy.Configure(options, configuration);
        return options;
    }
}
