namespace PortalSantaCasa.Server.DTOs
{
    public class FeedbackCreateDto
    {
        public string Name { get; set; } = null!;
        public string? Email { get; set; }
        public string? Department { get; set; }
        public string Category { get; set; } = null!;
        public string TargetDepartment { get; set; } = null!;
        public string Subject { get; set; } = null!;
        public string Message { get; set; } = null!;
        public bool IsRead { get; set; }
    }
    public class FeedbackUpdateDto
    {
        public string Category { get; set; } = null!;
        public string Subject { get; set; } = null!;
        public string TargetDepartment { get; set; } = null!;
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
        public DateTime CreatedAt { get; set; }
    }
}
