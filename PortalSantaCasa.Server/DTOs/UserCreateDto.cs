namespace PortalSantaCasa.Server.DTOs
{
    public class UserCreateDto
    {
        public string Username { get; set; } = null!;
        public string? Email { get; set; }
        public string? Senha { get; set; }
        public string UserType { get; set; } = null!;
        public string Department { get; set; } = null!;
        public IFormFile? File { get; set; }
        public bool IsActive { get; set; }
    }
}
