namespace PortalSantaCasa.Server.DTOs
{
    public class EventCreateDto
    {
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public DateTimeOffset EventDate { get; set; }
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
        public DateTimeOffset EventDate { get; set; }
        public string? Location { get; set; }
        public string? MediaUrl { get; set; }
        public string ResponsableName { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }
    public class EventUpdateDto
    {
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public DateTimeOffset EventDate { get; set; }
        public string? Location { get; set; }
        public IFormFile? File { get; set; }
        public bool IsActive { get; set; }
        public int UserId { get; set; }
    }
}
