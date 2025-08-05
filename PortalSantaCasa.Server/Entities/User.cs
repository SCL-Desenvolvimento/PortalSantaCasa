namespace PortalSantaCasa.Server.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = null!;
        public string? Email { get; set; }
        public required string Senha { get; set; }
        public string UserType { get; set; } = null!;
        public string PhotoUrl { get; set; } = null!;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
