using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class BannerCreateDto
    {
        [Required] [StringLength(160)]
        public string Title { get; set; } = string.Empty;
        [Required] [StringLength(10000)]
        public string Description { get; set; } = string.Empty;
        [Required]
        public IFormFile File { get; set; } = null!;
        public int Order { get; set; }
        public int TimeSeconds { get; set; }
        public bool IsActive { get; set; }
        public int? NewsId { get; set; }
    }

    public class BannerUpdateDto
    {
        [Required] [StringLength(160)]
        public string Title { get; set; } = string.Empty;
        [Required] [StringLength(10000)]
        public string Description { get; set; } = string.Empty;
        public IFormFile? File { get; set; }
        public int Order { get; set; }
        public int TimeSeconds { get; set; }
        public bool IsActive { get; set; }
        public int? NewsId { get; set; }
    }

    public class BannerResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public int Order { get; set; }
        public int TimeSeconds { get; set; }
        public bool IsActive { get; set; }
        public int? NewsId { get; set; }
    }
}
