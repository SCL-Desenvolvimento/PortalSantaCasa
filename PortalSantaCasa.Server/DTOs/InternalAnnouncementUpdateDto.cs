namespace PortalSantaCasa.Server.DTOs
{
    public class InternalAnnouncementUpdateDto
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime? ExpirationDate { get; set; }
        public bool IsActive { get; set; }
        public bool ShowMask { get; set; } = true;

        public int UserId { get; set; }
    }
}
