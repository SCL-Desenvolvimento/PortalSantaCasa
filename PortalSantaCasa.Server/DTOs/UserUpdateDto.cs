namespace PortalSantaCasa.Server.DTOs
{
    public class UserUpdateDto
    {
        public string Username { get; set; }
        public string? Email { get; set; }
        public string? Senha { get; set; }
        public string? UserType { get; set; }
        public string? PhotoUrl { get; set; }
        public bool IsActive { get; set; }
    }

}
