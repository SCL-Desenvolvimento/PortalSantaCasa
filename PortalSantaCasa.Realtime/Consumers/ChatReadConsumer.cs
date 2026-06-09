using MassTransit;
using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Shared.Events.Chat;

namespace PortalSantaCasa.Realtime.Consumers;

public class ChatReadConsumer : IConsumer<ChatReadEvent>
{
    private readonly IHubContext<ChatHub> _hub;

    public ChatReadConsumer(IHubContext<ChatHub> hub)
    {
        _hub = hub;
    }

    public async Task Consume(ConsumeContext<ChatReadEvent> context)
    {
        var userIds = context.Message.UserIds
            .Select(id => id.ToString())
            .ToList();

        if (userIds.Any())
        {
            await _hub.Clients
                .Users(userIds)
                .SendAsync("ChatRead", context.Message.UserId);

            return;
        }

        await _hub.Clients
            .Group(context.Message.ChatId.ToString())
            .SendAsync("ChatRead", context.Message.UserId);
    }
}
