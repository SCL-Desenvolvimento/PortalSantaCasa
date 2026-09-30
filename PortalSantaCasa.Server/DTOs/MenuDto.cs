using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class MenuCreateDto
    {
        [Required] [StringLength(160)]
        public string DiaDaSemana { get; set; } = null!;
        [Required] [StringLength(160)]
        public string Titulo { get; set; } = null!;
        [Required] [StringLength(10000)]
        public string Descricao { get; set; } = null!;
        public IFormFile File { get; set; } = null!;
    }
    public class MenuUpdateDto
    {
        [Required] [StringLength(160)]
        public string DiaDaSemana { get; set; } = null!;
        [Required] [StringLength(160)]
        public string Titulo { get; set; } = null!;
        [Required] [StringLength(10000)]
        public string Descricao { get; set; } = null!;
        public IFormFile? File { get; set; } = null!;
    }
    public class MenuResponseDto
    {
        public int Id { get; set; }
        public string DiaDaSemana { get; set; } = null!;
        public string Titulo { get; set; } = null!;
        public string Descricao { get; set; } = null!;
        public string ImagemUrl { get; set; } = null!;
    }
}
