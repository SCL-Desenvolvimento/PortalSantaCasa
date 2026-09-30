using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Realtime.Services;
using System.Security.Claims;

namespace PortalSantaCasa.Realtime.Hubs;

[Authorize]
public class PresenceHub : Hub
{
    private readonly PresenceService _presence;

    public PresenceHub(PresenceService presence)
    {
        _presence = presence;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();

        if (userId != null)
            await _presence.HeartbeatAsync(userId.Value);

        await Clients.All.SendAsync(
            "UsersOnline",
            await _presence.GetOnlineUsersAsync());

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await Clients.All.SendAsync(
            "UsersOnline",
            await _presence.GetOnlineUsersAsync());

        await base.OnDisconnectedAsync(exception);
    }

    public async Task Heartbeat()
    {
        if (Context.Items.TryGetValue("lastHeartbeat", out var last) && last is DateTimeOffset timestamp &&
            DateTimeOffset.UtcNow - timestamp < TimeSpan.FromSeconds(10)) return;
        Context.Items["lastHeartbeat"] = DateTimeOffset.UtcNow;
        var userId = GetUserId();

        if (userId == null)
            return;

        await _presence.HeartbeatAsync(userId.Value);

        await Clients.All.SendAsync(
            "UsersOnline",
            await _presence.GetOnlineUsersAsync());
    }

    public async Task GetOnlineUsers()
    {
        if (Context.Items.TryGetValue("lastOnlineQuery", out var last) && last is DateTimeOffset timestamp &&
            DateTimeOffset.UtcNow - timestamp < TimeSpan.FromSeconds(10)) return;
        Context.Items["lastOnlineQuery"] = DateTimeOffset.UtcNow;
        await Clients.Caller.SendAsync(
            "UsersOnline",
            await _presence.GetOnlineUsersAsync());
    }

    private int? GetUserId()
    {
        var claim =
            Context.User?.FindFirst("id") ??
            Context.User?.FindFirst("sub") ??
            Context.User?.FindFirst(ClaimTypes.NameIdentifier);

        if (claim == null)
            return null;

        return int.TryParse(claim.Value, out var userId)
            ? userId
            : null;
    }
}
