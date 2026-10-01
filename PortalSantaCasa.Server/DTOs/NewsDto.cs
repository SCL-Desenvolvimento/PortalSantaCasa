using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class NewsCreateDto
    {
        [Required] [StringLength(160)]
        public string Title { get; set; } = null!;
        [StringLength(2000)]
        public string? Summary { get; set; }
        [StringLength(100000)]
        public string? Content { get; set; }
        public bool IsQualityMinute { get; set; }
        public required IFormFile File { get; set; }
        public bool IsActive { get; set; }
        public int UserId { get; set; }
    }
    public class NewsUpdateDto
    {
        [Required] [StringLength(160)]
        public string Title { get; set; } = null!;
        [StringLength(2000)]
        public string? Summary { get; set; }
        [StringLength(100000)]
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
        public DateTimeOffset CreatedAt { get; set; }
        public int UserId { get; set; }
        public string AuthorName { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
    }

    public class NewsTotalsDto
    {
        public int TotalNews { get; set; }
        public int ActiveNews { get; set; }
        public int InactiveNews { get; set; }
    }
}
