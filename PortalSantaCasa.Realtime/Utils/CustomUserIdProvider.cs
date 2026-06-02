using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace PortalSantaCasa.Realtime.Utils;

public class CustomUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        return connection.User?.FindFirst("id")?.Value
            ?? connection.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? connection.User?.FindFirst("sub")?.Value;
    }
}