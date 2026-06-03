namespace PortalSantaCasa.Shared.DTOs.Notifications;

public class NotificationDto
{
    public int Id { get; set; }
    public string Type { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string Message { get; set; } = null!;
    public string? Link { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? NotificationDate { get; set; }
    public bool IsRead { get; set; }
}