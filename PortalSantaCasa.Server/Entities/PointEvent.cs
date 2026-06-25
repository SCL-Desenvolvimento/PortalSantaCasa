namespace PortalSantaCasa.Server.Entities
{
    public class PointEvent
    {
        public int Id { get; set; }
        public string RE { get; set; } = null!;
        public string EventType { get; set; } = null!;
        public string? ReferenceId { get; set; }
        public string? ReferenceTitle { get; set; }
        public string? Difficulty { get; set; }
        public int Points { get; set; }
        public int? TimeSeconds { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
