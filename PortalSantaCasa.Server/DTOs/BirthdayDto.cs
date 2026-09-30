using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class BirthdayCreateDto
    {
        [Required] [StringLength(160)]
        public string Name { get; set; } = null!;
        public DateOnly BirthDate { get; set; }
        [StringLength(160)]
        public string? Department { get; set; }
        [StringLength(160)]
        public string? Position { get; set; }
        public IFormFile? File { get; set; }
        public bool IsActive { get; set; }
    }
    public class BirthdayUpdateDto
    {
        [Required] [StringLength(160)]
        public string Name { get; set; } = null!;
        public DateOnly BirthDate { get; set; }
        [StringLength(160)]
        public string? Department { get; set; }
        [StringLength(160)]
        public string? Position { get; set; }
        public IFormFile? File { get; set; }
        public bool IsActive { get; set; }
    }
    public class BirthdayResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public DateOnly BirthDate { get; set; }
        public string? Department { get; set; }
        public string? Position { get; set; }
        public string? PhotoUrl { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
