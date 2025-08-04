namespace PortalSantaCasa.Server.DTOs
{
    public class MenuCreateDto
    {
        public string DiaDaSemana { get; set; } = null!;
        public string Titulo { get; set; } = null!;
        public string Descricao { get; set; } = null!;
        public string ImagemUrl { get; set; } = null!;
    }
}
