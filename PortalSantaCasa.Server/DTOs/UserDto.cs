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
    public class UserResponseDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = null!;
        public string? Email { get; set; }
        public required string Senha { get; set; }
        public string UserType { get; set; } = null!;
        public string PhotoUrl { get; set; } = null!;
        public string Department { get; set; } = null!;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
    public class UserUpdateDto
    {
        public string Username { get; set; }
        public string? Email { get; set; }
        public string? Senha { get; set; }
        public string UserType { get; set; }
        public string Department { get; set; }
        public IFormFile? File { get; set; }
        public bool IsActive { get; set; }
    }
}
