using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Entities;
using System.Text;
using Microsoft.EntityFrameworkCore;

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

            var existentes = (await _context.TussDePara
                    .AsNoTracking()
                    .Select(x => x.CodigoSigtap + "|" + x.CodigoTuss)
                    .ToListAsync())
                .ToHashSet();

            var buffer = new List<TussDePara>(BATCH_SIZE);

            using var stream = new StreamReader(arquivo.OpenReadStream(), Encoding.UTF8);

            await stream.ReadLineAsync(); // cabeçalho

            while (!stream.EndOfStream)
            {
                var line = await stream.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(line)) continue;

                var p1 = line.IndexOf(';');
                if (p1 < 0) continue;

                var p2 = line.IndexOf(';', p1 + 1);
                if (p2 < 0) continue;

                var p3 = line.IndexOf(';', p2 + 1);
                if (p3 < 0) continue;

                var tuss = line.Substring(0, p1).Trim();
                var sigtap = line.Substring(p2 + 1, p3 - p2 - 1).Trim();
                var descricao = line.Substring(p3 + 1).Trim();

                if (string.IsNullOrEmpty(tuss) || string.IsNullOrEmpty(sigtap))
                    continue;

                var chave = sigtap + "|" + tuss;

                if (!existentes.Add(chave))
                    continue;

                buffer.Add(new TussDePara
                {
                    CodigoSigtap = sigtap,
                    CodigoTuss = tuss,
                    Descricao = descricao
                });

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
    }
}
