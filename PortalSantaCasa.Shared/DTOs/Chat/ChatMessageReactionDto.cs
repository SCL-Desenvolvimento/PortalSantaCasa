namespace PortalSantaCasa.Shared.DTOs.Chat;

public class ChatMessageReactionDto
{
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;
}
