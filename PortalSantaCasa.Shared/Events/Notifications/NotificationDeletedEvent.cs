namespace PortalSantaCasa.Shared.Events.Notifications;

public class NotificationDeletedEvent
{
    public IEnumerable<int> NotificationIds { get; set; } = [];
}
