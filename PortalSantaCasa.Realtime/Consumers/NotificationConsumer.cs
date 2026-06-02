using MassTransit;
using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Shared.Events.Notifications;

namespace PortalSantaCasa.Realtime.Consumers;

public class NotificationConsumer : IConsumer<NotificationCreatedEvent>
{
    private readonly IHubContext<NotificationHub> _hub;

    public NotificationConsumer(IHubContext<NotificationHub> hub)
    {
        _hub = hub;
    }

    public async Task Consume(ConsumeContext<NotificationCreatedEvent> context)
    {
        if (context.Message.IsGlobal)
        {
            await _hub.Clients.All.SendAsync(
                "ReceiveNotification",
                context.Message.Notification);

            return;
        }

        var userIds = context.Message.UserIds
            .Select(id => id.ToString())
            .ToList();

        if (userIds.Any())
        {
            await _hub.Clients.Users(userIds).SendAsync(
                "ReceiveNotification",
                context.Message.Notification);
        }
    }
}