namespace PortalSantaCasa.Server.Entities
{
    public class Player
    {
        public string RE { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string Sector { get; set; } = null!;
        public DateTime? LastAccess { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
