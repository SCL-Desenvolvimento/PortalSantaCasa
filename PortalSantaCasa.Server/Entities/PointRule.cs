namespace PortalSantaCasa.Server.Entities
{
    public class PointRule
    {
        public int Id { get; set; }
        public string EventType { get; set; } = null!;
        public string? Difficulty { get; set; }
        public int Points { get; set; }
        public int BonusPoints { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
