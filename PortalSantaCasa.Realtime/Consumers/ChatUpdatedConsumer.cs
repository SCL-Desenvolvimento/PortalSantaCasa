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
        var userIds = context.Message.UserIds
            .Select(id => id.ToString())
            .ToList();

        if (userIds.Any())
        {
            await _hub.Clients
                .Users(userIds)
                .SendAsync("ChatUpdated", context.Message.Chat);

            return;
        }

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
