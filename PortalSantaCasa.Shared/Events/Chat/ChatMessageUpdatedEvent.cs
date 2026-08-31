using PortalSantaCasa.Shared.DTOs.Chat;

namespace PortalSantaCasa.Shared.Events.Chat;

public class ChatMessageUpdatedEvent
{
    public int ChatId { get; set; }
    public IEnumerable<int> UserIds { get; set; } = [];
    public ChatMessageDto Message { get; set; } = null!;
}
