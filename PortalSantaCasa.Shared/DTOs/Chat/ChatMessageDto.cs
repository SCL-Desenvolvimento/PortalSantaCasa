namespace PortalSantaCasa.Shared.DTOs.Chat;

public class ChatMessageDto
{
    public int Id { get; set; }
    public int ChatId { get; set; }
    public int SenderId { get; set; }
    public int MessageType { get; set; }
    public int? SystemEventType { get; set; }
    public int? TargetUserId { get; set; }
    public string? TargetUserName { get; set; }
    public int? RemovedByUserId { get; set; }
    public string? RemovedByUserName { get; set; }
    public int? AddedByUserId { get; set; }
    public string? AddedByUserName { get; set; }
    public string SenderName { get; set; } = null!;
    public string SenderUsername { get; set; } = null!;
    public string? SenderDisplayName { get; set; }
    public string? SenderRe { get; set; }
    public string? SenderDepartment { get; set; }
    public string SenderAvatarUrl { get; set; } = null!;
    public string? Content { get; set; }
    public DateTimeOffset SentAt { get; set; }
    public bool IsSent { get; set; }
    public ChatFileDto? File { get; set; }
}
