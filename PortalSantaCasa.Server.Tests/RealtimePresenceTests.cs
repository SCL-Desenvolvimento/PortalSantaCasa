using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Realtime.Services;
using StackExchange.Redis;
using System.Net;
using System.Reflection;
using System.Security.Claims;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class RealtimePresenceTests
{
    [Fact]
    public async Task PresenceWritesExpiringKeysAndReturnsOnlyValidUserIds()
    {
        var setup = Setup();
        await setup.Service.HeartbeatAsync(12);
        Assert.Equal("presence:user:12", setup.Database.LastKey);
        Assert.Equal((Expiration)TimeSpan.FromMinutes(2), setup.Database.Expiry);
        var users = await setup.Service.GetOnlineUsersAsync();
        Assert.Single(users);
        Assert.Equal(12, users.Single().GetType().GetProperty("id")!.GetValue(users.Single()));
    }

    [Fact]
    public async Task RedisOutageDoesNotBreakHeartbeatOrOnlineQuery()
    {
        var setup = Setup(); setup.Database.Fail = true;
        await setup.Service.HeartbeatAsync(12);
        Assert.Empty(await setup.Service.GetOnlineUsersAsync());
    }

    [Fact]
    public async Task HubThrottlesHeartbeatsAndOnlineQueriesPerConnection()
    {
        var setup = Setup();
        var client = DispatchProxy.Create<ISingleClientProxy, ClientStub>();
        var clients = DispatchProxy.Create<IHubCallerClients, ClientsStub>(); ((ClientsStub)(object)clients).Client = client;
        var hub = new PresenceHub(setup.Service) { Context = new Caller(), Clients = clients };
        await hub.Heartbeat(); await hub.Heartbeat();
        Assert.Equal(1, setup.Database.Writes);
        Assert.Equal(1, ((ClientStub)(object)client).Sends);
        await hub.GetOnlineUsers(); await hub.GetOnlineUsers();
        Assert.Equal(2, ((ClientStub)(object)client).Sends);
    }

    private static (PresenceService Service, DatabaseStub Database) Setup()
    {
        var database = DispatchProxy.Create<IDatabase, DatabaseStub>();
        var server = DispatchProxy.Create<IServer, ServerStub>();
        var multiplexer = DispatchProxy.Create<IConnectionMultiplexer, MultiplexerStub>();
        ((MultiplexerStub)(object)multiplexer).Database = database;
        ((MultiplexerStub)(object)multiplexer).Server = server;
        ((DatabaseStub)(object)database).Multiplexer = multiplexer;
        return (new PresenceService(multiplexer, NullLogger<PresenceService>.Instance), (DatabaseStub)(object)database);
    }

    private class Caller : HubCallerContext
    {
        public override string ConnectionId => "test-connection";
        public override string? UserIdentifier => "12";
        public override ClaimsPrincipal User { get; } = new(new ClaimsIdentity([new Claim("id", "12")], "test"));
        public override IDictionary<object, object?> Items { get; } = new Dictionary<object, object?>();
        public override IFeatureCollection Features { get; } = new FeatureCollection();
        public override CancellationToken ConnectionAborted => default;
        public override void Abort() { }
    }
}

public class DatabaseStub : DispatchProxy
{
    public IConnectionMultiplexer Multiplexer { get; set; } = null!;
    public bool Fail { get; set; }
    public int Writes { get; private set; }
    public string? LastKey { get; private set; }
    public object? Expiry { get; private set; }
    protected override object? Invoke(MethodInfo? method, object?[]? args)
    {
        if (method!.Name == "get_Multiplexer") return Multiplexer;
        if (Fail) throw new RedisConnectionException(ConnectionFailureType.UnableToConnect, "test outage");
        if (method.Name == "StringSetAsync")
        {
            Writes++; LastKey = args![0]!.ToString(); Expiry = args[2]; return Task.FromResult(true);
        }
        if (method.Name == "StringGetAsync") return Task.FromResult((RedisValue)(args![0]!.ToString()!.EndsWith(":12") ? "12" : "invalid"));
        throw new NotSupportedException(method.Name);
    }
}
public class MultiplexerStub : DispatchProxy
{
    public IDatabase Database { get; set; } = null!;
    public IServer Server { get; set; } = null!;
    protected override object? Invoke(MethodInfo? method, object?[]? args) => method!.Name switch {
        "GetDatabase" => Database, "GetServer" => Server, "GetEndPoints" => new EndPoint[] { new DnsEndPoint("localhost", 6379) },
        _ => throw new NotSupportedException(method.Name)
    };
}
public class ServerStub : DispatchProxy
{
    protected override object? Invoke(MethodInfo? method, object?[]? args) => method!.Name == "Keys" ?
        new RedisKey[] { "presence:user:12", "presence:user:invalid" } : throw new NotSupportedException(method.Name);
}
public class ClientsStub : DispatchProxy
{
    public IClientProxy Client { get; set; } = null!;
    protected override object? Invoke(MethodInfo? method, object?[]? args) => Client;
}
public class ClientStub : DispatchProxy
{
    public int Sends { get; private set; }
    protected override object? Invoke(MethodInfo? method, object?[]? args) { Sends++; return Task.CompletedTask; }
}
