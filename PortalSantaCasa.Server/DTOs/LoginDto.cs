using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class LoginDto
    {
        [Required] [StringLength(160)]
        public string UserName { get; set; }
        [StringLength(256)]
        public string Password { get; set; }
    }
}
