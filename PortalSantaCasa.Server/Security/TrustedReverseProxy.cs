using System.Net;
using System.Net.Sockets;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Configuration;

namespace PortalSantaCasa.Server.Security;

public static class TrustedReverseProxy
{
    public static void Configure(ForwardedHeadersOptions options, IConfiguration configuration)
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = 1;
        var value = configuration["ReverseProxy:KnownProxy"];
        // Local development retains the framework's restricted loopback defaults.
        // Production Compose requires the operator-generated .gateway.env.
        if (value is null) return;
        if (!IPAddress.TryParse(value, out var address)
            || address.AddressFamily != AddressFamily.InterNetwork
            || address.Equals(IPAddress.Any) || address.Equals(IPAddress.Broadcast))
            throw new InvalidOperationException("ReverseProxy:KnownProxy must be a single valid gateway IPv4 address.");

        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
        options.KnownProxies.Add(address);
    }
}
