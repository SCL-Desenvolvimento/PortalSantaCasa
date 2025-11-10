namespace PortalSantaCasa.Server.DTOs
{
    public class InternalAnnouncementCreateDto
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime PublishDate { get; set; } = DateTime.UtcNow;
        public DateTime? ExpirationDate { get; set; }
        public bool IsActive { get; set; } = true;
        public bool ShowMask { get; set; } = true;

        public int UserId { get; set; }
    }
}
