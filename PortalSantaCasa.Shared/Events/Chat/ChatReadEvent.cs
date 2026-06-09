namespace PortalSantaCasa.Shared.Events.Chat;

public class ChatReadEvent
{
    public int ChatId { get; set; }
    public int UserId { get; set; }
    public IEnumerable<int> UserIds { get; set; } = [];
}
