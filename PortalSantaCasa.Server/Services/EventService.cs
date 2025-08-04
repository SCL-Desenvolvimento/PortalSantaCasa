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

        public EventService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<EventResponseDto>> GetAllAsync()
        {
            return await _context.Events
                .Select(e => new EventResponseDto
                {
                    Id = e.Id,
                    Title = e.Title,
                    Description = e.Description,
                    EventDate = e.EventDate,
                    Location = e.Location,
                    IsActive = e.IsActive,
                    CreatedAt = e.CreatedAt
                }).ToListAsync();
        }

        public async Task<EventResponseDto?> GetByIdAsync(int id)
        {
            var e = await _context.Events.FindAsync(id);
            if (e == null) return null;

            return new EventResponseDto
            {
                Id = e.Id,
                Title = e.Title,
                Description = e.Description,
                EventDate = e.EventDate,
                Location = e.Location,
                IsActive = e.IsActive,
                CreatedAt = e.CreatedAt
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
                CreatedAt = DateTime.UtcNow
            };

            _context.Events.Add(entity);
            await _context.SaveChangesAsync();

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
    }
}
