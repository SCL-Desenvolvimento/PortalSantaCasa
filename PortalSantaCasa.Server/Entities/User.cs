namespace PortalSantaCasa.Server.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = null!;
        public string? Email { get; set; }
        public required string Senha { get; set; }
        public string UserType { get; set; } = null!;
        public string Department { get; set; }
        public string PhotoUrl { get; set; } = null!;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public ICollection<News> News { get; set; } = new List<News>();
        public ICollection<Event> Events { get; set; } = new List<Event>();
        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    }
}
