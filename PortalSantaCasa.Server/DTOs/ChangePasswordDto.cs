using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class ChangePasswordDto
    {
        [StringLength(256)]
        public string NewPassword { get; set; } = string.Empty;
    }
}
