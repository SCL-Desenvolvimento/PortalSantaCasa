using PortalSantaCasa.Shared.DTOs.Chat;

namespace PortalSantaCasa.Shared.Events.Chat;

public class ChatMessageCreatedEvent
{
    public int ChatId { get; set; }
    public ChatMessageDto Message { get; set; } = null!;
}