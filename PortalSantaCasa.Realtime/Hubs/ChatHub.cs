using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PortalSantaCasa.Realtime.Hubs;

[Authorize]
public class ChatHub : Hub
{
    public async Task JoinChat(int chatId)
    {
        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            chatId.ToString());
    }

    public async Task LeaveChat(int chatId)
    {
        await Groups.RemoveFromGroupAsync(
            Context.ConnectionId,
            chatId.ToString());
    }
}