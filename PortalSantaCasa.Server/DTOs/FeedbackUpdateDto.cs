namespace PortalSantaCasa.Server.DTOs
{
    public class FeedbackUpdateDto
    {
        public string Category { get; set; } = null!;
        public string Subject { get; set; } = null!;
        public string TargetDepartment { get; set; } = null!;
        public string Message { get; set; } = null!;
        public bool IsRead { get; set; }
    }
}
