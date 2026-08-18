using MassTransit;
using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Shared.Events.Chat;

namespace PortalSantaCasa.Realtime.Consumers;

public class ChatMessageReactionsUpdatedConsumer : IConsumer<ChatMessageReactionsUpdatedEvent>
{
    private readonly IHubContext<ChatHub> _hub;

    public ChatMessageReactionsUpdatedConsumer(IHubContext<ChatHub> hub)
    {
        _hub = hub;
    }

    public async Task Consume(ConsumeContext<ChatMessageReactionsUpdatedEvent> context)
    {
        var userIds = context.Message.UserIds.Select(id => id.ToString()).ToList();
        if (userIds.Count == 0) return;

        await _hub.Clients.Users(userIds).SendAsync("MessageReactionsUpdated", new
        {
            context.Message.ChatId,
            context.Message.MessageId,
            context.Message.Reactions
        });
    }
}
