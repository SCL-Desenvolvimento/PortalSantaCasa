namespace PortalSantaCasa.Shared.Events.Chat;

public class ChatRemovedEvent
{
    public int UserId { get; set; }
    public int ChatId { get; set; }
}