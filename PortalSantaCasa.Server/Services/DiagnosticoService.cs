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
            // 1️⃣ Busca CID
            var cid = await _context.Cids
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Codigo == request.CidCodigo);

            if (cid == null)
                throw new Exception("CID não encontrado");

            // 2️⃣ Relaciona CID → SIGTAP (Sempre começamos pelo SIGTAP pois é a base do relacionamento CID)
            var sigtapCodigos = await _context.CidProcedimentos
                .AsNoTracking()
                .Where(x => x.CidCodigo == cid.Codigo)
                .Select(x => x.ProcedimentoCodigo)
                .ToListAsync();

            if (request.Regime.ToUpper() == "SUS")
            {
                // 3️⃣ SUS: Retorna os procedimentos SIGTAP diretamente
                var procedimentosSigtap = await _context.Procedimentos
                    .AsNoTracking()
                    .Where(p => sigtapCodigos.Contains(p.Codigo) && p.Tabela == "SIGTAP")
                    .ToListAsync();

                return new DiagnosticoRelacionamentoDto
                {
                    HipoteseDiagnostica = cid,
                    Procedimentos = procedimentosSigtap
                };
            }
            else if (request.Regime.ToUpper() == "CONVENIO")
            {
                // 4️⃣ CONVENIO: Converte SIGTAP para TUSS usando a tabela De-Para
                // Buscamos todos os De-Para para os códigos SIGTAP encontrados
                var deParaList = await _context.TussDePara
                    .AsNoTracking()
                    .Where(dp => sigtapCodigos.Contains(dp.CodigoSigtap))
                    .ToListAsync();

                var tussCodigos = deParaList.Select(dp => dp.CodigoTuss).Distinct().ToList();

                // Buscamos os procedimentos na tabela TUSS
                var procedimentosTuss = await _context.Procedimentos
                    .AsNoTracking()
                    .Where(p => tussCodigos.Contains(p.Codigo) && p.Tabela == "TUSS")
                    .ToListAsync();

                return new DiagnosticoRelacionamentoDto
                {
                    HipoteseDiagnostica = cid,
                    Procedimentos = procedimentosTuss
                };
            }
            else
            {
                throw new Exception("Regime de atendimento inválido. Use 'SUS' ou 'CONVENIO'.");
            }
        }
    }
}
