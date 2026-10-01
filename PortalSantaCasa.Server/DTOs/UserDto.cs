using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class UserCreateDto
    {
        [Required] [StringLength(160)]
        public string Username { get; set; } = null!;
        [StringLength(160)]
        public string? Email { get; set; }
        [StringLength(256)]
        public string? Senha { get; set; }
        [Required] [StringLength(160)] [RegularExpression("(?i)^(superadmin|admin|editor|viewer)$")]
        public string UserType { get; set; } = null!;
        [Required] [StringLength(160)]
        public string Department { get; set; } = null!;
        public IFormFile? File { get; set; }
        public bool IsActive { get; set; }
    }
    public class UserResponseDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = null!;
        public string? Email { get; set; }
        public string UserType { get; set; } = null!;
        public string PhotoUrl { get; set; } = null!;
        public string Department { get; set; } = null!;
        public bool IsActive { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
    }
    public class UserUpdateDto
    {
        [Required] [StringLength(160)]
        public string Username { get; set; } = string.Empty;
        [StringLength(160)]
        public string? Email { get; set; }
        [StringLength(256)]
        public string? Senha { get; set; }
        [Required] [StringLength(160)] [RegularExpression("(?i)^(superadmin|admin|editor|viewer)$")]
        public string UserType { get; set; } = string.Empty;
        [Required] [StringLength(160)]
        public string Department { get; set; } = string.Empty;
        public IFormFile? File { get; set; }
        public bool IsActive { get; set; }
    }

    public class UserSummaryDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = null!;
        public string Department { get; set; } = null!;
        public string PhotoUrl { get; set; } = null!;
        public bool IsActive { get; set; }
    }

    public class UserProfileUpdateDto
    {
        [Required] [StringLength(160)]
        public string Username { get; set; } = string.Empty;
        [StringLength(160)]
        public string? Email { get; set; }
        public IFormFile? File { get; set; }
    }

    public class ChangeOwnPasswordDto
    {
        [StringLength(256)]
        public string CurrentPassword { get; set; } = string.Empty;
        [StringLength(256)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
