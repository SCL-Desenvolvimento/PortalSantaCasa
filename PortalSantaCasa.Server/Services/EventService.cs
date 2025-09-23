using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class EventService : IEventService
    {
        private readonly PortalSantaCasaDbContext _context;
        private INotificationService _notificationService;

        public EventService(PortalSantaCasaDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        public async Task<IEnumerable<EventResponseDto>> GetAllAsync()
        {
            return await _context.Events
                .Include(e => e.User)
                .OrderByDescending(e => e.CreatedAt)
                .Select(e => new EventResponseDto
                {
                    Id = e.Id,
                    Title = e.Title,
                    Description = e.Description,
                    EventDate = e.EventDate,
                    Location = e.Location,
                    IsActive = e.IsActive,
                    CreatedAt = e.CreatedAt,
                    ResponsableName = e.User.Username
                }).ToListAsync();
        }

        public async Task<IEnumerable<EventResponseDto>> GetAllPaginatedAsync(int page, int perPage)
        {
            return await _context.Events
                .Include(e => e.User)
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .Select(e => new EventResponseDto
                {
                    Id = e.Id,
                    Title = e.Title,
                    Description = e.Description,
                    EventDate = e.EventDate,
                    Location = e.Location,
                    IsActive = e.IsActive,
                    CreatedAt = e.CreatedAt,
                    ResponsableName = e.User.Username
                }).ToListAsync();
        }

        public async Task<EventResponseDto?> GetByIdAsync(int id)
        {
            var e = await _context.Events.Include(e => e.User).FirstOrDefaultAsync(e => e.Id == id);
            if (e == null) return null;

            return new EventResponseDto
            {
                Id = e.Id,
                Title = e.Title,
                Description = e.Description,
                EventDate = e.EventDate,
                Location = e.Location,
                IsActive = e.IsActive,
                CreatedAt = e.CreatedAt,
                ResponsableName = e.User.Username
            };
        }

        public async Task<EventResponseDto> CreateAsync(EventCreateDto dto)
        {
            var entity = new Event
            {
                Title = dto.Title,
                Description = dto.Description,
                EventDate = dto.EventDate,
                Location = dto.Location,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                UserId = dto.UserId
            };

            _context.Events.Add(entity);
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(
                type: "event",
                title: "Novo evento",
                message: entity.Title,
                link: $"/events/{entity.Id}"
            );

            return await GetByIdAsync(entity.Id) ?? throw new Exception("Erro ao criar evento");
        }

        public async Task<bool> UpdateAsync(int id, EventUpdateDto dto)
        {
            var e = await _context.Events.FindAsync(id);
            if (e == null) return false;

            e.Title = dto.Title;
            e.Description = dto.Description;
            e.EventDate = dto.EventDate;
            e.Location = dto.Location;
            e.IsActive = dto.IsActive;
            e.UserId = dto.UserId;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var e = await _context.Events.FindAsync(id);
            if (e == null) return false;

            _context.Events.Remove(e);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<EventResponseDto>> GetNextEvents()
        {
            var today = DateTime.Today;
            var endDate = today.AddDays(30);

            var events = await _context.Events
                .Include(e => e.User)
                .Where(e => e.EventDate.Date >= today && e.EventDate.Date <= endDate)
                .OrderBy(e => e.EventDate)
                .ToListAsync();

            return events.Select(e => new EventResponseDto
            {
                Id = e.Id,
                Title = e.Title,
                Description = e.Description,
                EventDate = e.EventDate,
                Location = e.Location,
                IsActive = e.IsActive,
                CreatedAt = e.CreatedAt,
                ResponsableName = e.User.Username
            });
        }


    }
}
