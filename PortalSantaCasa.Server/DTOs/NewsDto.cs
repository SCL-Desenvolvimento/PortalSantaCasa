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
    public class NewsUpdateDto
    {
        public string Title { get; set; } = null!;
        public string? Summary { get; set; }
        public string? Content { get; set; }
        public IFormFile? File { get; set; }
        public bool IsActive { get; set; }
        public int UserId { get; set; }
    }

    public class NewsResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
        public string? Summary { get; set; }
        public string? Content { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsQualityMinute { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string AuthorName { get; set; }
        public string Department { get; set; }
    }
}
