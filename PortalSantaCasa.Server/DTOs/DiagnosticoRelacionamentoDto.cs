using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.DTOs
{
    public class DiagnosticoRelacionamentoDto
    {
        public Cid10 HipoteseDiagnostica { get; set; }
        public List<Procedimento> Procedimentos { get; set; }

    }
}
