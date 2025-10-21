using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class InternalAnnouncementService : IInternalAnnouncementService
    {
        private readonly PortalSantaCasaDbContext _context;

        public InternalAnnouncementService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task<InternalAnnouncementResponseDto> CreateAsync(InternalAnnouncementCreateDto dto)
        {
            var entity = new InternalAnnouncement
            {
                Title = dto.Title,
                Content = dto.Content,
                PublishDate = dto.PublishDate,
                ExpirationDate = dto.ExpirationDate,
                IsActive = dto.IsActive,
                UserId = dto.UserId,
                ShowMask = dto.ShowMask
            };

            _context.InternalAnnouncements.Add(entity);
            await _context.SaveChangesAsync();

            await _context.Entry(entity).Reference(a => a.User).LoadAsync();

            return MapToResponseDto(entity);
        }

        public async Task<InternalAnnouncementResponseDto?> UpdateAsync(int id, InternalAnnouncementUpdateDto dto)
        {
            var entity = await _context.InternalAnnouncements
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (entity == null) return null;

            entity.Title = dto.Title;
            entity.Content = dto.Content;
            entity.ExpirationDate = dto.ExpirationDate;
            entity.IsActive = dto.IsActive;
            entity.UserId = dto.UserId;
            entity.ShowMask = dto.ShowMask;

            await _context.SaveChangesAsync();

            return MapToResponseDto(entity);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.InternalAnnouncements.FindAsync(id);
            if (entity == null) return false;

            _context.InternalAnnouncements.Remove(entity);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<InternalAnnouncementResponseDto?> GetByIdAsync(int id)
        {
            var entity = await _context.InternalAnnouncements
                .Include(a => a.User)
                .FirstOrDefaultAsync(a => a.Id == id);

            return entity == null ? null : MapToResponseDto(entity);
        }

        public async Task<IEnumerable<InternalAnnouncementResponseDto>> GetAllAsync()
        {
            return await _context.InternalAnnouncements
                .Include(a => a.User)
                .Select(a => MapToResponseDto(a))
                .ToListAsync();
        }

        public async Task<IEnumerable<InternalAnnouncementResponseDto>> GetAllPaginatedAsync(int page, int perPage)
        {
            return await _context.InternalAnnouncements
                .Include(a => a.User)
                .OrderByDescending(a => a.PublishDate)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .Select(a => MapToResponseDto(a))
                .ToListAsync();
        }

        public async Task<int> GetTotalCountAsync()
        {
            return await _context.InternalAnnouncements.CountAsync();
        }

        private static InternalAnnouncementResponseDto MapToResponseDto(InternalAnnouncement entity)
        {
            return new InternalAnnouncementResponseDto
            {
                Id = entity.Id,
                Title = entity.Title,
                Content = entity.Content,
                PublishDate = entity.PublishDate,
                ExpirationDate = entity.ExpirationDate,
                IsActive = entity.IsActive,
                UserId = entity.UserId,
                UserName = entity.User?.Username ?? string.Empty,
                ShowMask = entity.ShowMask
            };
        }
    }
}
