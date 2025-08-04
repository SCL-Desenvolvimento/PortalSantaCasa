namespace PortalSantaCasa.Server.DTOs
{
    public class UserCreateDto
    {
        public string Username { get; set; } = null!;
        public string? Email { get; set; }
        public required string Senha { get; set; }
        public string UserType { get; set; } = null!;
        public string PhotoUrl { get; set; } = null!;
        public bool IsActive { get; set; }
    }
}
