namespace PortalSantaCasa.Server.Entities
{
    public class CidProcedimento
    {
        public int ProcedimentoId { get; set; }
        public Procedimento Procedimento { get; set; }

        public string CidCodigo { get; set; }
        public Cid10 Cid { get; set; }
    }

}
