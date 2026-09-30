using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class FeedbackCreateDto
    {
        [Required] [StringLength(160)]
        public string Name { get; set; } = null!;
        [StringLength(160)]
        public string? Email { get; set; }
        [StringLength(160)]
        public string? Department { get; set; }
        [Required] [StringLength(160)]
        public string Category { get; set; } = null!;
        [Required] [StringLength(160)]
        public string TargetDepartment { get; set; } = null!;
        [Required] [StringLength(160)]
        public string Subject { get; set; } = null!;
        [Required] [StringLength(10000)]
        public string Message { get; set; } = null!;
        public bool IsRead { get; set; }
    }
    public class FeedbackUpdateDto
    {
        [Required] [StringLength(160)]
        public string Category { get; set; } = null!;
        [Required] [StringLength(160)]
        public string Subject { get; set; } = null!;
        [Required] [StringLength(160)]
        public string TargetDepartment { get; set; } = null!;
        [Required] [StringLength(10000)]
        public string Message { get; set; } = null!;
        public bool IsRead { get; set; }
    }
    public class FeedbackResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Email { get; set; }
        public string? Department { get; set; }
        public string Category { get; set; } = null!;
        public string TargetDepartment { get; set; }
        public string Subject { get; set; } = null!;
        public string Message { get; set; } = null!;
        public bool IsRead { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
}
