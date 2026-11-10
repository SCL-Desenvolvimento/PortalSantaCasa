using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Realtime.Services;
using StackExchange.Redis;
using System.Reflection;
using System.Security.Claims;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class RealtimePresenceTests
{
    [Fact]
    public async Task PresenceExpiresAfterTwoMinutesAndReturnsOnlyValidUserIds()
    {
        var setup = Setup();
        var before = DateTimeOffset.UtcNow.AddMinutes(2).ToUnixTimeMilliseconds();
        await setup.Service.HeartbeatAsync(12);
        Assert.Equal("presence:users", setup.Database.LastKey);
        Assert.InRange(setup.Database.Entries["12"], before,
            DateTimeOffset.UtcNow.AddMinutes(2).ToUnixTimeMilliseconds());
        setup.Database.Entries["invalid"] = before;
        setup.Database.Entries["34"] = DateTimeOffset.UtcNow.AddSeconds(-1).ToUnixTimeMilliseconds();
        var users = await setup.Service.GetOnlineUsersAsync();
        Assert.Single(users);
        Assert.Equal(12, users.Single().GetType().GetProperty("id")!.GetValue(users.Single()));
        Assert.False(setup.Database.Entries.ContainsKey("34"));
    }

    [Fact]
    public async Task RepeatedHeartbeatRefreshesPresenceWithoutDuplicatingUsers()
    {
        var setup = Setup();
        setup.Database.Entries["12"] = DateTimeOffset.UtcNow.AddSeconds(-1).ToUnixTimeMilliseconds();
        await setup.Service.HeartbeatAsync(12);
        await setup.Service.HeartbeatAsync(12);
        Assert.Single(await setup.Service.GetOnlineUsersAsync());
        Assert.Single(setup.Database.Entries);
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

    [Theory]
    [InlineData(typeof(ChatHub))]
    [InlineData(typeof(NotificationHub))]
    [InlineData(typeof(PresenceHub))]
    public void RealtimeHubsRequireAuthentication(Type hubType)
    {
        Assert.NotEmpty(hubType.GetCustomAttributes<AuthorizeAttribute>(true));
        Assert.Empty(hubType.GetCustomAttributes<AllowAnonymousAttribute>(true));
        Assert.All(hubType.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly),
            method => Assert.Empty(method.GetCustomAttributes<AllowAnonymousAttribute>(true)));
    }

    [Theory]
    [InlineData("id")]
    [InlineData("sub")]
    [InlineData(ClaimTypes.NameIdentifier)]
    public async Task ConnectSupportsEachUserIdClaimAndBroadcastsPresence(string claimType)
    {
        var setup = Setup();
        var clients = new RecordingHub<PresenceHub>();
        var hub = new PresenceHub(setup.Service) { Context = new Caller(new Claim(claimType, "34")), Clients = clients.CallerClients };
        await hub.OnConnectedAsync();
        Assert.True(setup.Database.Entries.ContainsKey("34"));
        var delivery = Assert.Single(clients.Deliveries);
        Assert.Equal("All", delivery.Target);
        Assert.Equal("UsersOnline", delivery.Method);
        var onlineUser = Assert.Single(Assert.IsType<List<object>>(Assert.Single(delivery.Arguments)));
        Assert.Equal(34, onlineUser.GetType().GetProperty("id")!.GetValue(onlineUser));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("invalid")]
    public async Task MissingOrInvalidClaimDoesNotWritePresence(string? userId)
    {
        var setup = Setup();
        var clients = new RecordingHub<PresenceHub>();
        var hub = new PresenceHub(setup.Service)
        {
            Context = new Caller(userId == null ? [] : [new Claim("id", userId)]), Clients = clients.CallerClients
        };
        await hub.Heartbeat();
        Assert.Empty(setup.Database.Entries);
        Assert.Empty(clients.Deliveries);
        await hub.OnConnectedAsync();
        Assert.Empty(setup.Database.Entries);
        Assert.Equal("All", Assert.Single(clients.Deliveries).Target);
    }

    [Fact]
    public async Task HeartbeatUsesPrimaryIdWhenOtherIdentityClaimsArePresent()
    {
        var setup = Setup();
        var hub = new PresenceHub(setup.Service)
        {
            Context = new Caller(new Claim("id", "12"), new Claim("sub", "34"), new Claim(ClaimTypes.NameIdentifier, "56")),
            Clients = new RecordingHub<PresenceHub>().CallerClients
        };
        await hub.Heartbeat();
        Assert.Equal("12", Assert.Single(setup.Database.Entries).Key);
    }

    [Fact]
    public async Task OnlineQueryRepliesOnlyToCallerAndDisconnectBroadcastsWithoutRemovingAnotherSession()
    {
        var setup = Setup();
        await setup.Service.HeartbeatAsync(12);
        var clients = new RecordingHub<PresenceHub>();
        var hub = new PresenceHub(setup.Service) { Context = new Caller(), Clients = clients.CallerClients };
        await hub.GetOnlineUsers();
        Assert.Equal("Caller", Assert.Single(clients.Deliveries).Target);
        await hub.OnDisconnectedAsync(new IOException("connection lost"));
        Assert.Equal("All", clients.Deliveries.Last().Target);
        Assert.True(setup.Database.Entries.ContainsKey("12"));
    }

    [Fact]
    public async Task ExpiredThrottleWindowAllowsFreshHeartbeatAndQuery()
    {
        var setup = Setup();
        var clients = new RecordingHub<PresenceHub>();
        var caller = new Caller();
        var hub = new PresenceHub(setup.Service) { Context = caller, Clients = clients.CallerClients };
        await hub.Heartbeat(); await hub.GetOnlineUsers();
        caller.Items["lastHeartbeat"] = DateTimeOffset.UtcNow.AddSeconds(-11);
        caller.Items["lastOnlineQuery"] = DateTimeOffset.UtcNow.AddSeconds(-11);
        await hub.Heartbeat(); await hub.GetOnlineUsers();
        Assert.Equal(2, setup.Database.Writes);
        Assert.Equal(new[] { "All", "Caller", "All", "Caller" }, clients.Deliveries.Select(delivery => delivery.Target));
    }

    [Fact]
    public async Task ConnectAndQueryReturnEmptyPresenceDuringRedisOutage()
    {
        var setup = Setup(); setup.Database.Fail = true;
        var clients = new RecordingHub<PresenceHub>();
        var hub = new PresenceHub(setup.Service) { Context = new Caller(), Clients = clients.CallerClients };
        await hub.OnConnectedAsync(); await hub.GetOnlineUsers();
        Assert.Equal(2, clients.Deliveries.Count);
        Assert.All(clients.Deliveries, delivery => Assert.Empty(Assert.IsType<List<object>>(Assert.Single(delivery.Arguments))));
    }

    private static (PresenceService Service, DatabaseStub Database) Setup()
    {
        var database = DispatchProxy.Create<IDatabase, DatabaseStub>();
        var multiplexer = DispatchProxy.Create<IConnectionMultiplexer, MultiplexerStub>();
        ((MultiplexerStub)(object)multiplexer).Database = database;
        ((DatabaseStub)(object)database).Multiplexer = multiplexer;
        return (new PresenceService(multiplexer, NullLogger<PresenceService>.Instance), (DatabaseStub)(object)database);
    }

    private class Caller : HubCallerContext
    {
        public Caller() : this(new Claim("id", "12")) { }
        public Caller(params Claim[] claims) => User = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
        public override string ConnectionId => "test-connection";
        public override string? UserIdentifier => "12";
        public override ClaimsPrincipal User { get; }
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
    public Dictionary<string, double> Entries { get; } = [];
    protected override object? Invoke(MethodInfo? method, object?[]? args)
    {
        if (method!.Name == "get_Multiplexer") return Multiplexer;
        if (Fail) throw new RedisConnectionException(ConnectionFailureType.UnableToConnect, CommandFlags.None, "test outage");
        if (method.Name == "SortedSetAddAsync")
        {
            Writes++; LastKey = args![0]!.ToString();
            var member = args[1]!.ToString()!;
            var added = !Entries.ContainsKey(member);
            Entries[member] = (double)args[2]!;
            return Task.FromResult(added);
        }
        if (method.Name == "SortedSetRemoveRangeByScoreAsync")
        {
            var expired = Entries.Where(entry => entry.Value >= (double)args![1]! && entry.Value <= (double)args[2]!).Select(entry => entry.Key).ToArray();
            foreach (var member in expired) Entries.Remove(member);
            return Task.FromResult((long)expired.Length);
        }
        if (method.Name == "SortedSetRangeByScoreAsync")
            return Task.FromResult(Entries.Where(entry => entry.Value >= (double)args![1]! && entry.Value <= (double)args[2]!)
                .Select(entry => (RedisValue)entry.Key).ToArray());
        throw new NotSupportedException(method.Name);
    }
}
public class MultiplexerStub : DispatchProxy
{
    public IDatabase Database { get; set; } = null!;
    protected override object? Invoke(MethodInfo? method, object?[]? args) => method!.Name switch {
        "GetDatabase" => Database,
        _ => throw new NotSupportedException(method.Name)
    };
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
