namespace PortalSantaCasa.Shared.DTOs.Chat;

public class ChatDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public bool IsGroup { get; set; }
    public int UnreadMessagesCount { get; set; }
    public string LastMessage { get; set; } = string.Empty;
    public DateTimeOffset LastMessageTime { get; set; }
    public IEnumerable<UserChatDto> Members { get; set; } = [];
    public bool IsDeleted { get; set; }
}