using PortalSantaCasa.Shared.DTOs.Chat;

namespace PortalSantaCasa.Shared.Events.Chat;

public class ChatCreatedEvent
{
    public IEnumerable<int> UserIds { get; set; } = [];
    public ChatDto Chat { get; set; } = null!;
}