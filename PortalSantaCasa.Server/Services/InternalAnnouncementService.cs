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

        public async Task<InternalAnnouncementResponseDto?> UpdateAsync(
            int id,
            InternalAnnouncementUpdateDto dto,
            int? ownerId = null)
        {
            var entity = await _context.InternalAnnouncements
                .FirstOrDefaultAsync(a =>
                    a.Id == id &&
                    (!ownerId.HasValue || a.UserId == ownerId.Value));

            if (entity == null) return null;

            entity.Title = dto.Title;
            entity.Content = dto.Content;
            entity.ExpirationDate = dto.ExpirationDate;
            entity.IsActive = dto.IsActive;
            entity.UserId = dto.UserId;
            entity.ShowMask = dto.ShowMask;

            await _context.SaveChangesAsync();

            return await GetByIdAsync(entity.Id);
        }

        public async Task<bool> DeleteAsync(int id, int? ownerId = null)
        {
            var entity = await _context.InternalAnnouncements.FirstOrDefaultAsync(a =>
                a.Id == id &&
                (!ownerId.HasValue || a.UserId == ownerId.Value));
            if (entity == null) return false;

            _context.InternalAnnouncements.Remove(entity);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<InternalAnnouncementResponseDto?> GetByIdAsync(int id)
        {
            return await _context.InternalAnnouncements
                .AsNoTracking()
                .Where(a => a.Id == id)
                .Select(a => new InternalAnnouncementResponseDto
                {
                    Id = a.Id,
                    Title = a.Title,
                    Content = a.Content,
                    PublishDate = a.PublishDate,
                    ExpirationDate = a.ExpirationDate,
                    IsActive = a.IsActive,
                    UserId = a.UserId,
                    UserName = a.User.Username,
                    ShowMask = a.ShowMask
                })
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<InternalAnnouncementResponseDto>> GetAllAsync(int? ownerId = null)
        {
            var query = _context.InternalAnnouncements.AsNoTracking().AsQueryable();
            if (ownerId.HasValue)
                query = query.Where(item => item.UserId == ownerId.Value);

            return await query
                .Select(a => new InternalAnnouncementResponseDto
                {
                    Id = a.Id,
                    Title = a.Title,
                    Content = a.Content,
                    PublishDate = a.PublishDate,
                    ExpirationDate = a.ExpirationDate,
                    IsActive = a.IsActive,
                    UserId = a.UserId,
                    UserName = a.User.Username,
                    ShowMask = a.ShowMask
                })
                .ToListAsync();
        }

        public async Task<IEnumerable<InternalAnnouncementResponseDto>> GetAllPaginatedAsync(
            int page,
            int perPage,
            string status,
            int? ownerId = null)
        {
            var query = _context.InternalAnnouncements.AsNoTracking().AsQueryable();
            if (ownerId.HasValue)
                query = query.Where(item => item.UserId == ownerId.Value);

            if (status == "active")
                query = query.Where(n => n.IsActive);

            if (status == "inactive")
                query = query.Where(n => !n.IsActive);

            if (status == "public")
            {
                var now = DateTimeOffset.UtcNow;
                query = query.Where(n =>
                    n.IsActive &&
                    n.PublishDate <= now &&
                    (!n.ExpirationDate.HasValue || n.ExpirationDate > now));
            }

            return await query.OrderByDescending(a => a.PublishDate)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .Select(a => new InternalAnnouncementResponseDto
                {
                    Id = a.Id,
                    Title = a.Title,
                    Content = a.Content,
                    PublishDate = a.PublishDate,
                    ExpirationDate = a.ExpirationDate,
                    IsActive = a.IsActive,
                    UserId = a.UserId,
                    UserName = a.User.Username,
                    ShowMask = a.ShowMask
                })
                .ToListAsync();
        }

        public async Task<int> GetTotalCountAsync(string status, int? ownerId = null)
        {
            var query = _context.InternalAnnouncements.AsQueryable();
            if (ownerId.HasValue)
                query = query.Where(item => item.UserId == ownerId.Value);

            if (status == "active")
                query = query.Where(n => n.IsActive);

            if (status == "inactive")
                query = query.Where(n => !n.IsActive);

            if (status == "public")
            {
                var now = DateTimeOffset.UtcNow;
                query = query.Where(n =>
                    n.IsActive &&
                    n.PublishDate <= now &&
                    (!n.ExpirationDate.HasValue || n.ExpirationDate > now));
            }

            return await query.CountAsync();
        }

        public async Task<InternalTotalsDto> GetTotalsAsync(int? ownerId = null)
        {
            var query = _context.InternalAnnouncements.AsQueryable();
            if (ownerId.HasValue)
                query = query.Where(item => item.UserId == ownerId.Value);

            var totals = await query
                .GroupBy(_ => 1)
                .Select(group => new
                {
                    Total = group.Count(),
                    Active = group.Count(n => n.IsActive)
                })
                .FirstOrDefaultAsync();

            var totalInternal = totals?.Total ?? 0;
            var activeInternal = totals?.Active ?? 0;
            var inactiveInternal = totalInternal - activeInternal;

            return new InternalTotalsDto
            {
                TotalInternal = totalInternal,
                ActiveInternal = activeInternal,
                InactiveInternal = inactiveInternal
            };
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
