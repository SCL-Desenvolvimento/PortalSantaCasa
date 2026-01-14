using System.ComponentModel.DataAnnotations;

namespace PortalSantaCasa.Server.Entities
{
    public class Cid10
    {
        [Key]
        public string Codigo { get; set; }
        public string Descricao { get; set; }
    }
}
