using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Context;

namespace PortalSantaCasa.Server.Services
{
    public class FormsService : IFormsService
    {
        private readonly PortalSantaCasaDbContext _context;

        public FormsService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<FormsResponseDto>> GetAllAsync()
        {
            return await _context.Forms
                .Select(x => new FormsResponseDto
                {
                    Id = x.Id,
                    Title = x.Title,
                    Description = x.Description,
                    FormsLink = x.FormsLink
                }).ToListAsync();
        }

        public async Task<FormsResponseDto?> GetByIdAsync(int id)
        {
            var entity = await _context.Forms.FindAsync(id);
            if (entity == null) return null;

            return new FormsResponseDto
            {
                Id = entity.Id,
                Title = entity.Title,
                Description = entity.Description,
                FormsLink = entity.FormsLink
            };
        }

        public async Task<FormsResponseDto> CreateAsync(FormsCreateDto dto)
        {
            var entity = new Form
            {
                Title = dto.Title,
                Description = dto.Description,
                FormsLink = dto.FormsLink
            };

            _context.Forms.Add(entity);
            await _context.SaveChangesAsync();

            return new FormsResponseDto
            {
                Id = entity.Id,
                Title = entity.Title,
                Description = entity.Description,
                FormsLink = entity.FormsLink
            };
        }

        public async Task<FormsResponseDto?> UpdateAsync(int id, FormsUpdateDto dto)
        {
            var entity = await _context.Forms.FindAsync(id);
            if (entity == null) return null;

            entity.Title = dto.Title;
            entity.Description = dto.Description;
            entity.FormsLink = dto.FormsLink;

            await _context.SaveChangesAsync();

            return new FormsResponseDto
            {
                Id = entity.Id,
                Title = entity.Title,
                Description = entity.Description,
                FormsLink = entity.FormsLink
            };
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.Forms.FindAsync(id);
            if (entity == null) return false;

            _context.Forms.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
