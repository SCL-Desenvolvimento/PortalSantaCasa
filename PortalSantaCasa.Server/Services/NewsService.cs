using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Utils;

namespace PortalSantaCasa.Server.Services
{
    public class NewsService : INewsService
    {
        private readonly PortalSantaCasaDbContext _context;
        private readonly INotificationService _notificationService;

        public NewsService(PortalSantaCasaDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }
        public async Task<IEnumerable<NewsResponseDto>> GetAllAsync(int? ownerId = null)
        {
            var query = _context.News.AsNoTracking().AsQueryable();
            if (ownerId.HasValue)
                query = query.Where(news => news.UserId == ownerId.Value);

            return await query
                .Include(n => n.User)
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new NewsResponseDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Summary = n.Summary,
                    ImageUrl = n.ImageUrl,
                    VideoUrl = n.VideoUrl,
                    VideoPosition = n.VideoPosition,
                    IsActive = n.IsActive,
                    CreatedAt = n.CreatedAt,
                    IsQualityMinute = n.IsQualityMinute,
                    UserId = n.UserId,
                    AuthorName = n.User.Username,
                    Department = n.User.Department
                })
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<IEnumerable<NewsResponseDto>> GetAllPaginatedAsync(
            int page,
            int perPage,
            bool? isQualityMinute,
            string status,
            int? ownerId = null)
        {
            PaginationLimits.Normalize(ref page, ref perPage);
            var query = _context.News.Include(n => n.User).AsQueryable();

            if (isQualityMinute.HasValue)
                query = query.Where(n => n.IsQualityMinute == isQualityMinute.Value);
            if (ownerId.HasValue)
                query = query.Where(news => news.UserId == ownerId.Value);

            if (status == "active")
                query = query.Where(n => n.IsActive);

            if (status == "inactive")
                query = query.Where(n => !n.IsActive);

            return await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .Select(n => new NewsResponseDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Summary = n.Summary,
                    //Content = n.Content,
                    ImageUrl = n.ImageUrl,
                    VideoUrl = n.VideoUrl,
                    VideoPosition = n.VideoPosition,
                    IsActive = n.IsActive,
                    CreatedAt = n.CreatedAt,
                    IsQualityMinute = n.IsQualityMinute,
                    UserId = n.UserId,
                    AuthorName = n.User.Username,
                    Department = n.User.Department
                }).AsNoTracking().ToListAsync();
        }

        public async Task<int> GetTotalCountAsync(
            bool? isQualityMinute,
            string status,
            int? ownerId = null)
        {
            var query = _context.News.AsQueryable();

            if (isQualityMinute.HasValue)
                query = query.Where(n => n.IsQualityMinute == isQualityMinute.Value);
            if (ownerId.HasValue)
                query = query.Where(news => news.UserId == ownerId.Value);

            if (status == "active")
                query = query.Where(n => n.IsActive);

            if (status == "inactive")
                query = query.Where(n => !n.IsActive);

            return await query.CountAsync();
        }

        public async Task<NewsResponseDto?> GetByIdAsync(int id)
        {
            return await _context.News
                .AsNoTracking()
                .Where(n => n.Id == id)
                .Select(n => new NewsResponseDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Summary = n.Summary,
                    Content = n.Content,
                    ImageUrl = n.ImageUrl,
                    VideoUrl = n.VideoUrl,
                    VideoPosition = n.VideoPosition,
                    IsActive = n.IsActive,
                    CreatedAt = n.CreatedAt,
                    IsQualityMinute = n.IsQualityMinute,
                    UserId = n.UserId,
                    AuthorName = n.User.Username,
                    Department = n.User.Department
                })
                .FirstOrDefaultAsync();
        }

        public async Task<NewsResponseDto> CreateAsync(NewsCreateDto dto)
        {
            FileUploadValidator.EnsureImage(dto.File);
            if (dto.VideoFile != null) FileUploadValidator.EnsureVideo(dto.VideoFile);
            var entity = new News
            {
                Title = dto.Title,
                Summary = dto.Summary,
                Content = dto.Content,
                ImageUrl = await ProcessarMidiasAsync(dto.File),
                VideoUrl = await ProcessarVideoAsync(dto.VideoFile),
                VideoPosition = NormalizeVideoPosition(dto.VideoPosition),
                IsActive = dto.IsActive,
                IsQualityMinute = dto.IsQualityMinute,
                UserId = dto.UserId,
                CreatedAt = DateTimeOffset.UtcNow,
            };

            _context.News.Add(entity);
            await _context.SaveChangesAsync();

            // Disparar notificação
            await _notificationService.CreateNotificationAsync(new NotificationCreateDto()
            {
                Type = "news",
                Title = "Nova notícia publicada",
                Message = entity.Title,
                Link = $"/news/{entity.Id}"
            });

            return await GetByIdAsync(entity.Id) ?? throw new Exception("Erro ao criar notícia.");
        }

        public async Task<bool> UpdateAsync(int id, NewsUpdateDto dto, int? ownerId = null)
        {
            var n = await _context.News.FirstOrDefaultAsync(news =>
                news.Id == id &&
                (!ownerId.HasValue || news.UserId == ownerId.Value));
            if (n == null) return false;

            n.Title = dto.Title;
            n.Summary = dto.Summary;
            n.Content = dto.Content;
            n.IsActive = dto.IsActive;
            n.UserId = dto.UserId;
            n.VideoPosition = NormalizeVideoPosition(dto.VideoPosition);

            if (dto.File != null) FileUploadValidator.EnsureImage(dto.File);
            if (dto.VideoFile != null) FileUploadValidator.EnsureVideo(dto.VideoFile);

            var previousMedia = dto.File == null ? null : n.ImageUrl;
            if (dto.File != null)
            {
                n.ImageUrl = await ProcessarMidiasAsync(dto.File);
            }

            var previousVideo = dto.RemoveVideo || dto.VideoFile != null ? n.VideoUrl : null;
            if (dto.RemoveVideo)
                n.VideoUrl = null;
            if (dto.VideoFile != null)
                n.VideoUrl = await ProcessarVideoAsync(dto.VideoFile);

            await _context.SaveChangesAsync();
            if (previousMedia != "Uploads/Usuarios/default-user.png")
                UploadStorage.DeleteIfExists(previousMedia, "Noticias");
            UploadStorage.DeleteIfExists(previousVideo, "Noticias/Videos");
            return true;
        }

        public async Task<bool> DeleteAsync(int id, int? ownerId = null)
        {
            var n = await _context.News.FirstOrDefaultAsync(news =>
                news.Id == id &&
                (!ownerId.HasValue || news.UserId == ownerId.Value));
            if (n == null) return false;

            if (File.Exists(n.ImageUrl))
                UploadStorage.DeleteIfExists(n.ImageUrl, "Noticias");
            UploadStorage.DeleteIfExists(n.VideoUrl, "Noticias/Videos");

            _context.News.Remove(n);
            await _context.SaveChangesAsync();
            await _notificationService.DeleteBySourceAsync("news", $"/news/{id}");
            return true;
        }

        private static async Task<string?> ProcessarMidiasAsync(IFormFile midia)
        {
            if (midia == null) return null;

            FileUploadValidator.EnsureImage(midia);

            // Define o caminho para a pasta "Noticias"
            var baseDirectory = Path.Combine("Uploads", "Noticias").Replace("\\", "/");

            // Verifica se a pasta "Noticias" existe, e a cria caso não exista
            if (!Directory.Exists(baseDirectory))
            {
                Directory.CreateDirectory(baseDirectory);
            }

            // Gera o caminho completo para o arquivo dentro da pasta "Noticias"
            var filePath = Path.Combine(baseDirectory, Guid.NewGuid() + Path.GetExtension(midia.FileName)).Replace("\\", "/");

            // Salva o arquivo no caminho especificado
            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await midia.CopyToAsync(stream);
            }

            return filePath;
        }

        private static async Task<string?> ProcessarVideoAsync(IFormFile? video)
        {
            if (video == null) return null;
            var baseDirectory = Path.Combine("Uploads", "Noticias", "Videos").Replace("\\", "/");
            Directory.CreateDirectory(baseDirectory);
            var filePath = Path.Combine(baseDirectory, Guid.NewGuid() + Path.GetExtension(video.FileName)).Replace("\\", "/");
            await using var stream = new FileStream(filePath, FileMode.CreateNew);
            await video.CopyToAsync(stream);
            return filePath;
        }

        private static string NormalizeVideoPosition(string? position) =>
            string.Equals(position, "top", StringComparison.OrdinalIgnoreCase) ? "top" : "bottom";

        public async Task<IEnumerable<NewsResponseDto>> SearchAsync(
            string query,
            int? ownerId = null,
            bool activeOnly = true)
        {
            var normalizedQuery = query.Trim().ToLowerInvariant();
            var newsQuery = _context.News.AsNoTracking().AsQueryable();
            if (ownerId.HasValue)
                newsQuery = newsQuery.Where(news => news.UserId == ownerId.Value);
            if (activeOnly)
                newsQuery = newsQuery.Where(news => news.IsActive);

            return await newsQuery
                .Where(n => n.Title.ToLower().Contains(normalizedQuery) ||
                            (n.Summary != null && n.Summary.ToLower().Contains(normalizedQuery)) ||
                            (n.Content != null && n.Content.ToLower().Contains(normalizedQuery)))
                .Select(n => new NewsResponseDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Summary = n.Summary,
                    Content = n.Content,
                    ImageUrl = n.ImageUrl,
                    VideoUrl = n.VideoUrl,
                    VideoPosition = n.VideoPosition,
                    IsActive = n.IsActive,
                    CreatedAt = n.CreatedAt,
                    IsQualityMinute = n.IsQualityMinute,
                    UserId = n.UserId,
                    AuthorName = n.User.Username,
                    Department = n.User.Department
                }).ToListAsync();
        }

        public async Task<NewsTotalsDto> GetTotalsAsync(bool? isQualityMinute, int? ownerId = null)
        {
            var query = _context.News.AsQueryable();
            if (isQualityMinute.HasValue)
                query = query.Where(n => n.IsQualityMinute == isQualityMinute.Value);
            if (ownerId.HasValue)
                query = query.Where(news => news.UserId == ownerId.Value);

            var totals = await query
                .GroupBy(_ => 1)
                .Select(group => new
                {
                    Total = group.Count(),
                    Active = group.Count(n => n.IsActive)
                })
                .FirstOrDefaultAsync();

            var totalNews = totals?.Total ?? 0;
            var activeNews = totals?.Active ?? 0;
            var inactiveNews = totalNews - activeNews;

            return new NewsTotalsDto
            {
                TotalNews = totalNews,
                ActiveNews = activeNews,
                InactiveNews = inactiveNews
            };
        }
    }
}
