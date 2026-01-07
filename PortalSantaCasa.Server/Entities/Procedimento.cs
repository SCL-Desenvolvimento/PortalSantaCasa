using System.ComponentModel.DataAnnotations;

namespace PortalSantaCasa.Server.Entities
{
    public class Procedimento
    {
        [Key]
        public string Codigo { get; set; }
        public string Descricao { get; set; }
        public string Tabela { get; set; } // SIGTAP ou TUSS
        public decimal Valor { get; set; }
    }
}
