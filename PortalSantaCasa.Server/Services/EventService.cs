using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Utils;

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
                    MediaUrl = e.MediaUrl,
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
                    MediaUrl = e.MediaUrl,
                    IsActive = e.IsActive,
                    CreatedAt = e.CreatedAt,
                    ResponsableName = e.User.Username
                }).AsNoTracking().ToListAsync();
        }

        public Task<int> GetTotalCountAsync()
        {
            return _context.Events.CountAsync();
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
                MediaUrl = e.MediaUrl,
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
                MediaUrl = await ProcessarMidiaAsync(dto.File),
                IsActive = dto.IsActive,
                CreatedAt = DateTimeOffset.UtcNow,
                UserId = dto.UserId
            };

            _context.Events.Add(entity);
            await _context.SaveChangesAsync();

            await _notificationService.CreateNotificationAsync(new NotificationCreateDto()
            {
                Type = "event",
                Title = "Novo evento",
                Message = entity.Title,
                Link = $"/events/{entity.Id}"
            });

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

            if (dto.File != null)
            {
                DeleteMediaFile(e.MediaUrl);
                e.MediaUrl = await ProcessarMidiaAsync(dto.File);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var e = await _context.Events.FindAsync(id);
            if (e == null) return false;

            DeleteMediaFile(e.MediaUrl);
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
                MediaUrl = e.MediaUrl,
                IsActive = e.IsActive,
                CreatedAt = e.CreatedAt,
                ResponsableName = e.User.Username
            });
        }

        public async Task<IEnumerable<EventResponseDto>> SearchAsync(string query)
        {
            return await _context.Events
                .Include(e => e.User)
                .Where(e => e.Title.ToLower().Contains(query.ToLower()) ||
                            e.Description.ToLower().Contains(query.ToLower()) ||
                            e.Location.ToLower().Contains(query.ToLower()))
                .Select(e => new EventResponseDto
                {
                    Id = e.Id,
                    Title = e.Title,
                    Description = e.Description,
                    EventDate = e.EventDate,
                    Location = e.Location,
                    MediaUrl = e.MediaUrl,
                    IsActive = e.IsActive,
                    CreatedAt = e.CreatedAt,
                    ResponsableName = e.User.Username
                }).ToListAsync();
        }

        private static async Task<string?> ProcessarMidiaAsync(IFormFile? media)
        {
            if (media == null) return null;

            FileUploadValidator.EnsureEventMedia(media);

            var baseDirectory = Path.Combine("Uploads", "Eventos").Replace("\\", "/");
            Directory.CreateDirectory(baseDirectory);

            var filePath = Path.Combine(baseDirectory, Guid.NewGuid() + Path.GetExtension(media.FileName)).Replace("\\", "/");
            await using var stream = new FileStream(filePath, FileMode.Create);
            await media.CopyToAsync(stream);
            return filePath;
        }

        private static void DeleteMediaFile(string? mediaUrl)
        {
            if (!string.IsNullOrWhiteSpace(mediaUrl) && File.Exists(mediaUrl))
                File.Delete(mediaUrl);
        }
    }
}
