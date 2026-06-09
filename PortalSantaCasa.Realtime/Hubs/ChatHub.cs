using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace PortalSantaCasa.Realtime.Hubs;

[Authorize]
public class ChatHub : Hub
{
    public async Task JoinChat(int chatId)
    {
        await Task.CompletedTask;
    }

    public async Task LeaveChat(int chatId)
    {
        await Task.CompletedTask;
    }
}
