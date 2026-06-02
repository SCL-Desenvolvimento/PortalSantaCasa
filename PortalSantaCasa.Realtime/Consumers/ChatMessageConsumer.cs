using MassTransit;
using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Shared.Events.Chat;

namespace PortalSantaCasa.Realtime.Consumers;

public class ChatMessageConsumer : IConsumer<ChatMessageCreatedEvent>
{
    private readonly IHubContext<ChatHub> _hub;
    private readonly ILogger<ChatMessageConsumer> _logger;

    public ChatMessageConsumer(
        IHubContext<ChatHub> hub,
        ILogger<ChatMessageConsumer> logger)
    {
        _hub = hub;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<ChatMessageCreatedEvent> context)
    {
        _logger.LogInformation(
            "Recebido ChatMessageCreatedEvent. ChatId: {ChatId}, MessageId: {MessageId}",
            context.Message.ChatId,
            context.Message.Message.Id);

        await _hub.Clients
            .Group(context.Message.ChatId.ToString())
            .SendAsync("ReceiveMessage", context.Message.Message);
    }
}