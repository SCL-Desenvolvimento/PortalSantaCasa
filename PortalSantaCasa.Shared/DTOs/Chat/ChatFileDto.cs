namespace PortalSantaCasa.Shared.DTOs.Chat;

public class ChatFileDto
{
    public string Url { get; set; } = null!;
    public string ContentType { get; set; } = null!;
    public string FileName { get; set; } = null!;
    public long Size { get; set; }
}