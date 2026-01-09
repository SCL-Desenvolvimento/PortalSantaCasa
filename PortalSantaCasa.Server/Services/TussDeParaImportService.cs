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

        public async Task ImportarTussValuesAsync(IFormFile arquivo)
        {
            const int BATCH_SIZE = 5000;

            _context.ChangeTracker.AutoDetectChangesEnabled = false;

            // Carrega os códigos existentes para evitar duplicatas (considerando que Codigo é a Key)
            var existentes = (await _context.Procedimentos
                    .AsNoTracking()
                    .Select(x => x.Codigo)
                    .ToListAsync())
                .ToHashSet();

            var buffer = new List<Procedimento>(BATCH_SIZE);

            using var stream = new StreamReader(arquivo.OpenReadStream(), Encoding.UTF8);

            // O arquivo tus.csv parece não ter cabeçalho baseado na leitura das primeiras linhas, 
            // mas o padrão do outro serviço pula a primeira linha. 
            // Se o CSV tiver cabeçalho, descomente a linha abaixo:
            // await stream.ReadLineAsync(); 

            while (!stream.EndOfStream)
            {
                var line = await stream.ReadLineAsync();
                if (string.IsNullOrWhiteSpace(line)) continue;

                // Formato esperado baseado no tus.csv: Codigo;Descricao;Tabela;Valor
                var parts = line.Split(';');
                if (parts.Length < 4) continue;

                var codigo = parts[0].Trim();
                var descricao = parts[1].Trim();
                var tabela = parts[2].Trim();
                var valorStr = parts[3].Trim();

                if (string.IsNullOrEmpty(codigo))
                    continue;

                // Evita duplicatas
                if (!existentes.Add(codigo))
                    continue;

                // Trata a conversão do valor decimal (considerando vírgula como separador decimal no CSV)
                decimal.TryParse(valorStr.Replace(",", "."), NumberStyles.Any, CultureInfo.InvariantCulture, out decimal valor);

                buffer.Add(new Procedimento
                {
                    Codigo = codigo,
                    Descricao = descricao,
                    Tabela = tabela,
                    Valor = valor
                });

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
