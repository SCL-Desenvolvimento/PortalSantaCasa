namespace PortalSantaCasa.Server.Entities
{
    public class Event
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public DateTimeOffset EventDate { get; set; }
        public string? Location { get; set; }
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }

        public int UserId { get; set; }
        public User User { get; set; } = null!;
    }
}
