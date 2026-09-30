using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class DocumentCreateDto
    {
        [Required] [StringLength(160)]
        public string Name { get; set; } = null!;
        public int? ParentId { get; set; }
        public IFormFile? File { get; set; }
        public List<string>? AllowedRoles { get; set; }
        public bool IsActive { get; set; }
    }
    public class DocumentUpdateDto
    {
        [Required] [StringLength(160)]
        public string Name { get; set; } = null!;
        public int? ParentId { get; set; }
        public IFormFile? File { get; set; }
        public List<string>? AllowedRoles { get; set; }
        public bool IsActive { get; set; }
    }
    public class DocumentResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public int? ParentId { get; set; }
        public string? FileUrl { get; set; }
        public string? FileName { get; set; }
        public List<string> AllowedRoles { get; set; } = [];
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
