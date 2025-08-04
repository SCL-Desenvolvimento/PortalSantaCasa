namespace PortalSantaCasa.Server.DTOs
{
    public class EventCreateDto
    {
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public DateOnly EventDate { get; set; }
        public string? Location { get; set; }
        public bool IsActive { get; set; }
    }
}
