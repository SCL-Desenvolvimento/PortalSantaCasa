using MassTransit;
using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Shared.Events.Chat;

namespace PortalSantaCasa.Realtime.Consumers;

public class ChatMessageUpdatedConsumer : IConsumer<ChatMessageUpdatedEvent>
{
    private readonly IHubContext<ChatHub> _hub;

    public ChatMessageUpdatedConsumer(IHubContext<ChatHub> hub)
    {
        _hub = hub;
    }

    public async Task Consume(ConsumeContext<ChatMessageUpdatedEvent> context)
    {
        var userIds = context.Message.UserIds.Select(id => id.ToString()).ToList();
        if (userIds.Count > 0)
        {
            await _hub.Clients.Users(userIds)
                .SendAsync("MessageUpdated", context.Message.Message);
        }
    }
}
