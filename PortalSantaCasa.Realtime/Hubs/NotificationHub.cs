using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PortalSantaCasa.Realtime.Hubs;

[Authorize]
public class NotificationHub : Hub
{
}