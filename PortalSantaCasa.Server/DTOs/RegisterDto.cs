using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class RegisterDto
    {
        [Required] [StringLength(160)]
        public string Username { get; set; } = string.Empty;
        [Required] [StringLength(160)]
        public string Email { get; set; } = string.Empty;
        [StringLength(256)]
        public string Password { get; set; } = string.Empty;
    }
}
