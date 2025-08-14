namespace PortalSantaCasa.Server.Entities
{
    public class Menu
    {
        public int Id { get; set; }
        public string DiaDaSemana { get; set; } = null!;
        public string Titulo { get; set; } = null!;
        public string Descricao { get; set; } = null!;
        public string ImagemUrl { get; set; } = null!;
    }
}
