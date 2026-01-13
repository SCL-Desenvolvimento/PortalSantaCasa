using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Entities;
using System.Globalization;
using System.Text;

namespace PortalSantaCasa.Server.Services
{
    public class SigtapImportService
    {
        private readonly PortalSantaCasaDbContext _context;

        public SigtapImportService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task ImportarAsync(List<IFormFile> files)
        {
            var cid = files.FirstOrDefault(f => f.FileName.Contains("tb_cid"));
            var procedimento = files.FirstOrDefault(f => f.FileName.Contains("tb_procedimento"));
            var relacionamento = files.FirstOrDefault(f => f.FileName.Contains("rl_procedimento_cid"));

            if (cid != null) ImportarCids(cid);
            if (procedimento != null) ImportarProcedimentos(procedimento);
            if (relacionamento != null) ImportarRelacionamentoCidProcedimento(relacionamento);

            await _context.SaveChangesAsync();
        }

        private void ImportarCids(IFormFile arquivo)
        {
            var cidsDb = _context.Cids
                .AsNoTracking()
                .ToDictionary(x => x.Codigo);

            var novos = new List<Cid10>();

            using var reader = new StreamReader(arquivo.OpenReadStream(), Encoding.Latin1);

            while (!reader.EndOfStream)
            {
                var linha = reader.ReadLine();
                if (linha.Length < 104) continue;

                var codigo = linha.AsSpan(0, 4).ToString().Trim();
                var descricao = linha.AsSpan(4, 100).ToString().Trim();

                if (cidsDb.TryGetValue(codigo, out var cid))
                {
                    cid.Descricao = descricao;
                    _context.Cids.Update(cid);
                }
                else
                {
                    novos.Add(new Cid10
                    {
                        Codigo = codigo,
                        Descricao = descricao
                    });
                }
            }

            if (novos.Count > 0)
                _context.Cids.AddRange(novos);
        }

        private void ImportarProcedimentos(IFormFile arquivo)
        {
            var procedimentosDb = _context.Procedimentos
                .Where(x => x.Tabela == "SIGTAP")
                .AsNoTracking()
                .ToDictionary(x => x.Codigo);

            var novos = new List<Procedimento>();

            using var reader = new StreamReader(arquivo.OpenReadStream(), Encoding.Latin1);

            while (!reader.EndOfStream)
            {
                var linha = reader.ReadLine();
                if (linha.Length < 318) continue;

                var codigo = linha.AsSpan(0, 10).ToString().Trim();
                var descricao = linha.AsSpan(10, 250).ToString().Trim();

                var vlSh = ParseValor(linha, 282);
                var vlSa = ParseValor(linha, 294);
                var vlSp = ParseValor(linha, 306);

                var valorTotal = (vlSh + vlSa + vlSp) / 100m;

                if (procedimentosDb.TryGetValue(codigo, out var proc))
                {
                    proc.Descricao = descricao;
                    proc.Valor = valorTotal;
                    _context.Procedimentos.Update(proc);
                }
                else
                {
                    novos.Add(new Procedimento
                    {
                        Codigo = codigo,
                        Descricao = descricao,
                        Tabela = "SIGTAP",
                        Valor = valorTotal
                    });
                }
            }

            if (novos.Count > 0)
                _context.Procedimentos.AddRange(novos);
        }

        private static decimal ParseValor(string linha, int start)
        {
            var span = linha.AsSpan(start, 12).Trim();
            return decimal.TryParse(span, NumberStyles.Any, CultureInfo.InvariantCulture, out var v)
                ? v
                : 0m;
        }

        private void ImportarRelacionamentoCidProcedimento(IFormFile arquivo)
        {
            var procedimentos = _context.Procedimentos
                .AsNoTracking()
                .Where(p => p.Tabela == "SIGTAP")
                .ToDictionary(p => p.Codigo, p => p.Id);

            var existentes = _context.CidProcedimentos
                .AsNoTracking()
                .Select(x => x.ProcedimentoId + "|" + x.CidCodigo)
                .ToHashSet();

            var novos = new List<CidProcedimento>();

            using var reader = new StreamReader(arquivo.OpenReadStream(), Encoding.Latin1);

            while (!reader.EndOfStream)
            {
                var linha = reader.ReadLine();
                if (linha.Length < 14) continue;

                var procCodigo = linha.AsSpan(0, 10).ToString().Trim();
                var cid = linha.AsSpan(10, 4).ToString().Trim();

                if (!procedimentos.TryGetValue(procCodigo, out var procedimentoId))
                    continue;

                var chave = procedimentoId + "|" + cid;
                if (!existentes.Add(chave)) continue;

                novos.Add(new CidProcedimento
                {
                    ProcedimentoId = procedimentoId,
                    CidCodigo = cid
                });
            }

            if (novos.Count > 0)
                _context.CidProcedimentos.AddRange(novos);
        }

    }
}
