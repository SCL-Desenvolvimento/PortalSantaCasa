using PortalSantaCasa.Shared.DTOs.Notifications;

namespace PortalSantaCasa.Shared.Events.Notifications;

public class NotificationCreatedEvent
{
    public NotificationDto Notification { get; set; } = null!;
    public bool IsGlobal { get; set; }
    public IEnumerable<int> UserIds { get; set; } = [];
}