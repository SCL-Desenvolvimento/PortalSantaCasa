namespace PortalSantaCasa.Server.DTOs
{
    public class BirthdayResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public DateOnly BirthDate { get; set; }
        public string? Department { get; set; }
        public string? Position { get; set; }
        public string? PhotoUrl { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
