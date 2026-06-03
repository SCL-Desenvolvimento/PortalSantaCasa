using MassTransit;
using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Shared.Events.Chat;

namespace PortalSantaCasa.Realtime.Consumers;

public class UnreadCountUpdatedConsumer : IConsumer<UnreadCountUpdatedEvent>
{
    private readonly IHubContext<ChatHub> _hub;

    public UnreadCountUpdatedConsumer(IHubContext<ChatHub> hub)
    {
        _hub = hub;
    }

    public async Task Consume(ConsumeContext<UnreadCountUpdatedEvent> context)
    {
        await _hub.Clients
            .User(context.Message.UserId.ToString())
            .SendAsync("UnreadCountUpdate", context.Message.UnreadCount);
    }
}