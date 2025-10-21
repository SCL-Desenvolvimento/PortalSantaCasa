namespace PortalSantaCasa.Server.DTOs
{
    public class InternalAnnouncementResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime PublishDate { get; set; }
        public DateTime? ExpirationDate { get; set; }
        public bool IsActive { get; set; }
        public bool ShowMask { get; set; }

        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;

    }
}
