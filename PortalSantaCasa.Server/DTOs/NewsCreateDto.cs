namespace PortalSantaCasa.Server.DTOs
{
    public class NewsCreateDto
    {
        public string Title { get; set; } = null!;
        public string? Summary { get; set; }
        public string? Content { get; set; }
        public bool IsQualityMinute { get; set; }
        public IFormFile File { get; set; }
        public bool IsActive { get; set; }
        public int UserId { get; set; }
    }

}
