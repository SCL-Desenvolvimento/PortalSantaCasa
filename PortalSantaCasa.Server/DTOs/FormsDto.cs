using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class FormsCreateDto
    {
        [Required] [StringLength(160)]
        public string Title { get; set; } = null!;
        [StringLength(10000)]
        public string? Description { get; set; }
        [StringLength(2000)] [PortalSantaCasa.Server.Security.HttpUrl]
        public string? FormsLink { get; set; }
    }
    public class FormsUpdateDto
    {
        [Required] [StringLength(160)]
        public string Title { get; set; } = null!;
        [StringLength(10000)]
        public string? Description { get; set; }
        [StringLength(2000)] [PortalSantaCasa.Server.Security.HttpUrl]
        public string? FormsLink { get; set; }
    }

    public class FormsResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string? FormsLink { get; set; }
    }
}
