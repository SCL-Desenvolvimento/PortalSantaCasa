using MassTransit;
using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Shared.Events.Chat;

namespace PortalSantaCasa.Realtime.Consumers;

public class ChatCreatedConsumer : IConsumer<ChatCreatedEvent>
{
    private readonly IHubContext<ChatHub> _hub;

    public ChatCreatedConsumer(IHubContext<ChatHub> hub)
    {
        _hub = hub;
    }

    public async Task Consume(ConsumeContext<ChatCreatedEvent> context)
    {
        foreach (var userId in context.Message.UserIds)
        {
            await _hub.Clients
                .User(userId.ToString())
                .SendAsync("NewChat", context.Message.Chat);
        }
    }
}