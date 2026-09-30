using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class RegisterDto
    {
        [Required] [StringLength(160)]
        public string Username { get; set; }
        [Required] [StringLength(160)]
        public string Email { get; set; }
        [StringLength(256)]
        public string Password { get; set; }
    }
}
