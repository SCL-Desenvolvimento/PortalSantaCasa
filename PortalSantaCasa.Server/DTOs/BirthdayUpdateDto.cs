namespace PortalSantaCasa.Server.DTOs
{
    public class BirthdayUpdateDto
    {
        public string Name { get; set; } = null!;
        public DateOnly BirthDate { get; set; }
        public string? Department { get; set; }
        public string? Position { get; set; }
        public IFormFile? PhotoUrl { get; set; }
        public bool IsActive { get; set; }
    }
}
