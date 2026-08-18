namespace PortalSantaCasa.Server.Entities;

public class ChatMessageReaction
{
    public int Id { get; set; }
    public int MessageId { get; set; }
    public int UserId { get; set; }
    public string Emoji { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ChatMessage Message { get; set; } = null!;
    public User User { get; set; } = null!;
}
