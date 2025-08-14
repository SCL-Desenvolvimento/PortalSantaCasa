namespace PortalSantaCasa.Server.DTOs
{
    public class EventResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public DateTime EventDate { get; set; }
        public string? Location { get; set; }
        public string ResponsableName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
