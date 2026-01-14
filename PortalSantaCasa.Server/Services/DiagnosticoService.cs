using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class DiagnosticoService : IDiagnosticoService
    {
        private readonly PortalSantaCasaDbContext _context;

        public DiagnosticoService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task<DiagnosticoRelacionamentoDto> ProcessarDiagnosticoAsync(DiagnosticoRequestDto request)
        {
            var cid = await _context.Cids
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Codigo == request.CidCodigo);

            if (cid == null)
                throw new Exception("CID não encontrado");

            var procedimentosSigtapIds = await _context.CidProcedimentos
                .AsNoTracking()
                .Where(x => x.CidCodigo == cid.Codigo)
                .Select(x => x.ProcedimentoId)
                .ToListAsync();

            if (request.Regime.ToUpper() == "SUS")
            {
                var procedimentos = await _context.Procedimentos
                    .AsNoTracking()
                    .Where(p => procedimentosSigtapIds.Contains(p.Id))
                    .ToListAsync();

                return new DiagnosticoRelacionamentoDto
                {
                    HipoteseDiagnostica = cid,
                    Procedimentos = procedimentos
                };
            }

            if (request.Regime.ToUpper() == "CONVENIO")
            {
                var procedimentosTussIds = await _context.TussDePara
                    .AsNoTracking()
                    .Where(x => procedimentosSigtapIds.Contains(x.ProcedimentoSigtapId))
                    .Select(x => x.ProcedimentoTussId)
                    .Distinct()
                    .ToListAsync();

                var procedimentos = await _context.Procedimentos
                    .AsNoTracking()
                    .Where(p => procedimentosTussIds.Contains(p.Id))
                    .ToListAsync();

                return new DiagnosticoRelacionamentoDto
                {
                    HipoteseDiagnostica = cid,
                    Procedimentos = procedimentos
                };
            }

            throw new Exception("Regime inválido");
        }
    }
}
