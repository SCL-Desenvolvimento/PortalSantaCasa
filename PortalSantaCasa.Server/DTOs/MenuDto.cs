namespace PortalSantaCasa.Server.DTOs
{
    public class MenuCreateDto
    {
        public string DiaDaSemana { get; set; } = null!;
        public string Titulo { get; set; } = null!;
        public string Descricao { get; set; } = null!;
        public IFormFile File { get; set; } = null!;
    }
    public class MenuUpdateDto
    {
        public string DiaDaSemana { get; set; } = null!;
        public string Titulo { get; set; } = null!;
        public string Descricao { get; set; } = null!;
        public IFormFile File { get; set; } = null!;
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
