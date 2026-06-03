using PortalSantaCasa.Shared.DTOs.Chat;

namespace PortalSantaCasa.Shared.Events.Chat;

public class ChatUpdatedEvent
{
    public int? ChatId { get; set; }
    public int? UserId { get; set; }
    public ChatDto Chat { get; set; } = null!;
}