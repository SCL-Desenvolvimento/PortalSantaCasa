using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class EventCreateDto
    {
        [Required] [StringLength(160)]
        public string Title { get; set; } = null!;
        [StringLength(10000)]
        public string? Description { get; set; }
        public DateTime EventDate { get; set; }
        [StringLength(160)]
        public string? Location { get; set; }
        public IFormFile? File { get; set; }
        public bool IsActive { get; set; }
        public int UserId { get; set; }
    }
    public class EventResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public DateTime EventDate { get; set; }
        public string? Location { get; set; }
        public string? MediaUrl { get; set; }
        public string ResponsableName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
    public class EventUpdateDto
    {
        [Required] [StringLength(160)]
        public string Title { get; set; } = null!;
        [StringLength(10000)]
        public string? Description { get; set; }
        public DateTime EventDate { get; set; }
        [StringLength(160)]
        public string? Location { get; set; }
        public IFormFile? File { get; set; }
        public bool IsActive { get; set; }
        public int UserId { get; set; }
    }
}
