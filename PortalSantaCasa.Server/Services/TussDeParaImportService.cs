using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Entities;
using System.Globalization;
using System.Text;

namespace PortalSantaCasa.Server.Services
{
    public class TussDeParaImportService
    {
        private readonly PortalSantaCasaDbContext _context;

        public TussDeParaImportService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task ImportarAsync(IFormFile arquivo)
        {
            const int BATCH_SIZE = 5000;

            _context.ChangeTracker.AutoDetectChangesEnabled = false;

            var procedimentosSigtap = await _context.Procedimentos
                .AsNoTracking()
                .Where(p => p.Tabela == "SIGTAP")
                .ToDictionaryAsync(p => p.Codigo);

            var procedimentosTuss = await _context.Procedimentos
                .AsNoTracking()
                .Where(p => p.Tabela == "TUSS")
                .GroupBy(p => p.Codigo)
                .ToDictionaryAsync(
                    g => g.Key,
                    g => g.ToList()
                );

            var existentes = (await _context.TussDePara
                .AsNoTracking()
                .Select(x => x.ProcedimentoSigtapId + "|" + x.ProcedimentoTussId)
                .ToListAsync())
                .ToHashSet();


            var buffer = new List<TussDePara>(BATCH_SIZE);

            using var reader = new StreamReader(arquivo.OpenReadStream(), Encoding.UTF8);
            await reader.ReadLineAsync(); // cabeçalho

            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(line)) continue;

                var parts = line.Split(';');
                if (parts.Length < 3) continue;

                var codigoTuss = parts[0].Trim();
                var codigoSigtap = parts[2].Trim();

                if (!procedimentosSigtap.TryGetValue(codigoSigtap, out var sigtap))
                    continue;

                if (!procedimentosTuss.TryGetValue(codigoTuss, out var tussList))
                    continue;

                foreach (var tuss in tussList)
                {
                    var chave = sigtap.Id + "|" + tuss.Id;
                    if (!existentes.Add(chave))
                        continue;

                    buffer.Add(new TussDePara
                    {
                        ProcedimentoSigtapId = sigtap.Id,
                        ProcedimentoTussId = tuss.Id
                    });
                }

                if (buffer.Count >= BATCH_SIZE)
                {
                    _context.TussDePara.AddRange(buffer);
                    await _context.SaveChangesAsync();
                    buffer.Clear();
                    _context.ChangeTracker.Clear();
                }
            }

            if (buffer.Count > 0)
            {
                _context.TussDePara.AddRange(buffer);
                await _context.SaveChangesAsync();
                _context.ChangeTracker.Clear();
            }

            _context.ChangeTracker.AutoDetectChangesEnabled = true;
        }
        public async Task ImportarTussValuesAsync(IFormFile arquivo)
        {
            const int BATCH_SIZE = 5000;

            _context.ChangeTracker.AutoDetectChangesEnabled = false;

            var existentes = await _context.Procedimentos
                .AsNoTracking()
                .Where(p => p.Tabela == "TUSS")
                .ToDictionaryAsync(p => p.Codigo);

            var buffer = new List<Procedimento>(BATCH_SIZE);

            using var stream = new StreamReader(arquivo.OpenReadStream(), Encoding.UTF8);

            while (!stream.EndOfStream)
            {
                var line = await stream.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(line)) continue;

                var parts = line.Split(';');
                if (parts.Length < 4) continue;

                var codigo = parts[0].Trim();
                var descricao = parts[1].Trim();
                var valorStr = parts[3].Trim();

                decimal.TryParse(valorStr.Replace(",", "."),
                    NumberStyles.Any,
                    CultureInfo.InvariantCulture,
                    out decimal valor);

                if (existentes.TryGetValue(codigo, out var proc))
                {
                    proc.Descricao = descricao;
                    proc.Valor = valor;
                    _context.Procedimentos.Update(proc);
                }
                else
                {
                    buffer.Add(new Procedimento
                    {
                        Codigo = codigo,
                        Descricao = descricao,
                        Tabela = "TUSS",
                        Valor = valor
                    });
                }

                if (buffer.Count >= BATCH_SIZE)
                {
                    _context.Procedimentos.AddRange(buffer);
                    await _context.SaveChangesAsync();
                    buffer.Clear();
                    _context.ChangeTracker.Clear();
                }
            }

            if (buffer.Count > 0)
            {
                _context.Procedimentos.AddRange(buffer);
                await _context.SaveChangesAsync();
                _context.ChangeTracker.Clear();
            }

            _context.ChangeTracker.AutoDetectChangesEnabled = true;
        }

    }
}
