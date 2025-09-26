namespace PortalSantaCasa.Server.DTOs
{
    public class PostCreateDto
    {
        public string Title { get; set; }
        public string Message { get; set; }
        public string? Image { get; set; } // Opcional, URL ou base64
        public List<string> Providers { get; set; } // Ex: "facebook", "instagram", "linkedin"
        public DateTime? ScheduledAtUtc { get; set; }
    }
}
