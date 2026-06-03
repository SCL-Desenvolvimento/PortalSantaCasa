namespace PortalSantaCasa.Shared.DTOs.Chat;

public class UserChatDto
{
    public int Id { get; set; }
    public string Username { get; set; } = null!;
    public string? Email { get; set; }
    public string Department { get; set; } = null!;
    public string PhotoUrl { get; set; } = null!;
    public bool IsActive { get; set; }
}