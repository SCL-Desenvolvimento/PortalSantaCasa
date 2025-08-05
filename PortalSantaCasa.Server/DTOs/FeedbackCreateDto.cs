namespace PortalSantaCasa.Server.DTOs
{
    public class FeedbackCreateDto
    {
        public string Name { get; set; } = null!;
        public string? Email { get; set; }
        public string? Department { get; set; }
        public string Category { get; set; } = null!;
        public string Subject { get; set; } = null!;
        public string Message { get; set; } = null!;
        public bool IsRead { get; set; }
    }
}
