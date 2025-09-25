using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace PortalSantaCasa.Server.Utils
{
    public class CustomUserIdProvider : IUserIdProvider
    {
        public string? GetUserId(HubConnectionContext connection)
        {
            // Pega do claim "id" que você já usa
            return connection.User?.FindFirst("id")?.Value;
        }
    }

}
