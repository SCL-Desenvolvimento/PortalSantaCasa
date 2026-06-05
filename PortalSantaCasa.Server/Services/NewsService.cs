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
        private INotificationService _notificationService;

        public NewsService(PortalSantaCasaDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }
        public async Task<IEnumerable<NewsResponseDto>> GetAllAsync()
        {
            return await _context.News
                .Include(n => n.User)
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new NewsResponseDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Summary = n.Summary,
                    ImageUrl = n.ImageUrl,
                    IsActive = n.IsActive,
                    CreatedAt = n.CreatedAt,
                    IsQualityMinute = n.IsQualityMinute,
                    AuthorName = n.User.Username,
                    Department = n.User.Department
                })
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<IEnumerable<NewsResponseDto>> GetAllPaginatedAsync(int page, int perPage, bool? isQualityMinute, string status)
        {
            var query = _context.News.Include(n => n.User).AsQueryable();

            query = query.Where(n => n.IsQualityMinute == isQualityMinute);

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
                    IsActive = n.IsActive,
                    CreatedAt = n.CreatedAt,
                    IsQualityMinute = n.IsQualityMinute,
                    AuthorName = n.User.Username,
                    Department = n.User.Department
                }).AsNoTracking().ToListAsync();
        }

        public async Task<int> GetTotalCountAsync(bool? isQualityMinute, string status)
        {
            var query = _context.News.AsQueryable();

            query = query.Where(n => n.IsQualityMinute == isQualityMinute);

            if (status == "active")
                query = query.Where(n => n.IsActive);

            if (status == "inactive")
                query = query.Where(n => !n.IsActive);

            return await query.CountAsync();
        }

        public async Task<NewsResponseDto?> GetByIdAsync(int id)
        {
            var n = await _context.News
                .Include(news => news.User)
                .FirstOrDefaultAsync(news => news.Id == id);

            if (n == null) return null;

            return new NewsResponseDto
            {
                Id = n.Id,
                Title = n.Title,
                Summary = n.Summary,
                Content = n.Content,
                ImageUrl = n.ImageUrl,
                IsActive = n.IsActive,
                CreatedAt = n.CreatedAt,
                IsQualityMinute = n.IsQualityMinute,
                AuthorName = n.User.Username,
                Department = n.User.Department
            };
        }

        public async Task<NewsResponseDto> CreateAsync(NewsCreateDto dto)
        {
            var entity = new News
            {
                Title = dto.Title,
                Summary = dto.Summary,
                Content = dto.Content,
                ImageUrl = await ProcessarMidiasAsync(dto.File),
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

        public async Task<bool> UpdateAsync(int id, NewsUpdateDto dto)
        {
            var n = await _context.News.FindAsync(id);
            if (n == null) return false;

            n.Title = dto.Title;
            n.Summary = dto.Summary;
            n.Content = dto.Content;
            n.IsActive = dto.IsActive;
            n.UserId = dto.UserId;

            if (!string.IsNullOrEmpty(n.ImageUrl) && dto.File != null)
            {
                if (File.Exists(n.ImageUrl))
                {
                    File.Delete(n.ImageUrl);
                }
            }

            if (dto.File != null)
            {
                n.ImageUrl = await ProcessarMidiasAsync(dto.File);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var n = await _context.News.FindAsync(id);
            if (n == null) return false;

            if (File.Exists(n.ImageUrl))
                File.Delete(n.ImageUrl);

            _context.News.Remove(n);
            await _context.SaveChangesAsync();
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

        public async Task<IEnumerable<NewsResponseDto>> SearchAsync(string query)
        {
            return await _context.News
                .Include(n => n.User)
                .Where(n => n.Title.ToLower().Contains(query.ToLower()) ||
                            n.Summary.ToLower().Contains(query.ToLower()) ||
                            n.Content.ToLower().Contains(query.ToLower()))
                .Select(n => new NewsResponseDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Summary = n.Summary,
                    Content = n.Content,
                    ImageUrl = n.ImageUrl,
                    IsActive = n.IsActive,
                    CreatedAt = n.CreatedAt,
                    IsQualityMinute = n.IsQualityMinute,
                    AuthorName = n.User.Username,
                    Department = n.User.Department
                }).ToListAsync();
        }

        public async Task<NewsTotalsDto> GetTotalsAsync(bool? isQualityMinute)
        {
            var totalNews = await _context.News.Where(n => n.IsQualityMinute == isQualityMinute).CountAsync();
            var activeNews = await _context.News.Where(n => n.IsQualityMinute == isQualityMinute).CountAsync(n => n.IsActive);
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
