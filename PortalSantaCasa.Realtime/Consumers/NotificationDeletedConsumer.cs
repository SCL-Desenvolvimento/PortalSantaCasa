using MassTransit;
using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Shared.Events.Notifications;

namespace PortalSantaCasa.Realtime.Consumers;

public class NotificationDeletedConsumer : IConsumer<NotificationDeletedEvent>
{
    private readonly IHubContext<NotificationHub> _hub;

    public NotificationDeletedConsumer(IHubContext<NotificationHub> hub)
    {
        _hub = hub;
    }

    public Task Consume(ConsumeContext<NotificationDeletedEvent> context) =>
        _hub.Clients.All.SendAsync(
            "NotificationsDeleted",
            context.Message.NotificationIds);
}
