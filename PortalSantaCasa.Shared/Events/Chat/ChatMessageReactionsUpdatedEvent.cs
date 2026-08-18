using PortalSantaCasa.Shared.DTOs.Chat;

namespace PortalSantaCasa.Shared.Events.Chat;

public class ChatMessageReactionsUpdatedEvent
{
    public int ChatId { get; set; }
    public int MessageId { get; set; }
    public IEnumerable<int> UserIds { get; set; } = [];
    public IEnumerable<ChatMessageReactionDto> Reactions { get; set; } = [];
}
