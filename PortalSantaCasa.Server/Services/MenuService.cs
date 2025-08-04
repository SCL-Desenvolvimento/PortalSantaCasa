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

        public MenuService(PortalSantaCasaDbContext context)
        {
            _context = context;
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
                ImagemUrl = dto.ImagemUrl
            };

            _context.Menus.Add(entity);
            await _context.SaveChangesAsync();

            return await GetByIdAsync(entity.Id) ?? throw new Exception("Erro ao criar cardápio.");
        }

        public async Task<bool> UpdateAsync(int id, MenuUpdateDto dto)
        {
            var m = await _context.Menus.FindAsync(id);
            if (m == null) return false;

            m.DiaDaSemana = dto.DiaDaSemana;
            m.Titulo = dto.Titulo;
            m.Descricao = dto.Descricao;
            m.ImagemUrl = dto.ImagemUrl;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var m = await _context.Menus.FindAsync(id);
            if (m == null) return false;

            _context.Menus.Remove(m);
            await _context.SaveChangesAsync();
            return true;
        }
    }

}
