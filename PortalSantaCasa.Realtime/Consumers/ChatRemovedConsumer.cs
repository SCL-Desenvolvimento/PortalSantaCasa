using MassTransit;
using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Shared.Events.Chat;

namespace PortalSantaCasa.Realtime.Consumers;

public class ChatRemovedConsumer : IConsumer<ChatRemovedEvent>
{
    private readonly IHubContext<ChatHub> _hub;

    public ChatRemovedConsumer(IHubContext<ChatHub> hub)
    {
        _hub = hub;
    }

    public async Task Consume(ConsumeContext<ChatRemovedEvent> context)
    {
        await _hub.Clients
            .User(context.Message.UserId.ToString())
            .SendAsync("ChatRemoved", context.Message.ChatId);
    }
}