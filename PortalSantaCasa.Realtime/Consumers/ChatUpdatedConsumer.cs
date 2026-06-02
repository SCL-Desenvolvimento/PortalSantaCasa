using MassTransit;
using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Shared.Events.Chat;

namespace PortalSantaCasa.Realtime.Consumers;

public class ChatUpdatedConsumer : IConsumer<ChatUpdatedEvent>
{
    private readonly IHubContext<ChatHub> _hub;

    public ChatUpdatedConsumer(IHubContext<ChatHub> hub)
    {
        _hub = hub;
    }

    public async Task Consume(ConsumeContext<ChatUpdatedEvent> context)
    {
        if (context.Message.UserId.HasValue)
        {
            await _hub.Clients
                .User(context.Message.UserId.Value.ToString())
                .SendAsync("ChatUpdated", context.Message.Chat);

            return;
        }

        if (context.Message.ChatId.HasValue)
        {
            await _hub.Clients
                .Group(context.Message.ChatId.Value.ToString())
                .SendAsync("ChatUpdated", context.Message.Chat);
        }
    }
}