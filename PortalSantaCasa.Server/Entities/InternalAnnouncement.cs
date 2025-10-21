namespace PortalSantaCasa.Server.Entities
{
    public class InternalAnnouncement
    {
        public int Id { get; set; }

        public string Title { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;

        public DateTime PublishDate { get; set; } = DateTime.UtcNow;

        public DateTime? ExpirationDate { get; set; }

        public bool IsActive { get; set; } = true;

        public bool ShowMask { get; set; } = true;

        public int UserId { get; set; }
        public User User { get; set; } = null!;
    }
}
