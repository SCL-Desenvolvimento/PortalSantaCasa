namespace PortalSantaCasa.Shared.Events.Chat;

public class UnreadCountUpdatedEvent
{
    public int UserId { get; set; }
    public int UnreadCount { get; set; }
}