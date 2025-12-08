using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class MenuService : IMenuService
    {
        private readonly PortalSantaCasaDbContext _context;
        private INotificationService _notificationService;

        public MenuService(PortalSantaCasaDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<IEnumerable<MenuResponseDto>> GetAllAsync()
        {
            return await _context.Menus
                .Select(m => new MenuResponseDto
                {
                    Id = m.Id,
                    DiaDaSemana = m.DiaDaSemana,
                    Titulo = m.Titulo,
                    Descricao = m.Descricao,
                    ImagemUrl = m.ImagemUrl
                }).ToListAsync();
        }

        public async Task<MenuResponseDto?> GetByIdAsync(int id)
        {
            var m = await _context.Menus.FindAsync(id);
            if (m == null) return null;

            return new MenuResponseDto
            {
                Id = m.Id,
                DiaDaSemana = m.DiaDaSemana,
                Titulo = m.Titulo,
                Descricao = m.Descricao,
                ImagemUrl = m.ImagemUrl
            };
        }

        public async Task<MenuResponseDto> CreateAsync(MenuCreateDto dto)
        {
            var entity = new Menu
            {
                DiaDaSemana = dto.DiaDaSemana,
                Titulo = dto.Titulo,
                Descricao = dto.Descricao,
                ImagemUrl = await ProcessarMidiasAsync(dto.File)
            };

            _context.Menus.Add(entity);
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(new NotificationCreateDto()
            {
                Type = "menu",
                Title = "Novo cardápio disponível",
                Message = entity.Titulo,
                Link = $"/menu/{entity.Id}"
            });

            return await GetByIdAsync(entity.Id) ?? throw new Exception("Erro ao criar cardápio.");
        }

        public async Task<bool> UpdateAsync(int id, MenuUpdateDto dto)
        {
            var m = await _context.Menus.FindAsync(id);
            if (m == null) return false;

            m.DiaDaSemana = dto.DiaDaSemana;
            m.Titulo = dto.Titulo;
            m.Descricao = dto.Descricao;

            if (!string.IsNullOrEmpty(m.ImagemUrl) && dto.File != null)
            {
                if (File.Exists(m.ImagemUrl))
                {
                    File.Delete(m.ImagemUrl);
                }
            }

            if (dto.File != null)
            {
                m.ImagemUrl = await ProcessarMidiasAsync(dto.File);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var m = await _context.Menus.FindAsync(id);
            if (m == null) return false;

            if (File.Exists(m.ImagemUrl))
                File.Delete(m.ImagemUrl);

            _context.Menus.Remove(m);
            await _context.SaveChangesAsync();
            return true;
        }

        private static async Task<string?> ProcessarMidiasAsync(IFormFile midia)
        {
            if (midia == null) return null;

            // Define o caminho para a pasta "Cárdapio"
            var baseDirectory = Path.Combine("Uploads", "Cardapio").Replace("\\", "/");

            // Verifica se a pasta "Cárdapio" existe, e a cria caso não exista
            if (!Directory.Exists(baseDirectory))
            {
                Directory.CreateDirectory(baseDirectory);
            }

            // Gera o caminho completo para o arquivo dentro da pasta "Cárdapio"
            var filePath = Path.Combine(baseDirectory, Guid.NewGuid() + Path.GetExtension(midia.FileName)).Replace("\\", "/");

            // Salva o arquivo no caminho especificado
            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await midia.CopyToAsync(stream);
            }

            return filePath;
        }
    }

}
