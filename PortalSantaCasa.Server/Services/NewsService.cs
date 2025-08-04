using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class NewsService : INewsService
    {
        private readonly PortalSantaCasaDbContext _context;

        public NewsService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<NewsResponseDto>> GetAllAsync()
        {
            return await _context.News
                .Select(n => new NewsResponseDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Summary = n.Summary,
                    Content = n.Content,
                    ImageUrl = n.ImageUrl,
                    IsActive = n.IsActive,
                    CreatedAt = n.CreatedAt
                }).ToListAsync();
        }

        public async Task<NewsResponseDto?> GetByIdAsync(int id)
        {
            var n = await _context.News.FindAsync(id);
            if (n == null) return null;

            return new NewsResponseDto
            {
                Id = n.Id,
                Title = n.Title,
                Summary = n.Summary,
                Content = n.Content,
                ImageUrl = n.ImageUrl,
                IsActive = n.IsActive,
                CreatedAt = n.CreatedAt
            };
        }

        public async Task<NewsResponseDto> CreateAsync(NewsCreateDto dto)
        {
            var entity = new News
            {
                Title = dto.Title,
                Summary = dto.Summary,
                Content = dto.Content,
                ImageUrl = dto.ImageUrl,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.News.Add(entity);
            await _context.SaveChangesAsync();

            return await GetByIdAsync(entity.Id) ?? throw new Exception("Erro ao criar notícia.");
        }

        public async Task<bool> UpdateAsync(int id, NewsUpdateDto dto)
        {
            var n = await _context.News.FindAsync(id);
            if (n == null) return false;

            n.Title = dto.Title;
            n.Summary = dto.Summary;
            n.Content = dto.Content;
            n.ImageUrl = dto.ImageUrl;
            n.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var n = await _context.News.FindAsync(id);
            if (n == null) return false;

            _context.News.Remove(n);
            await _context.SaveChangesAsync();
            return true;
        }
    }

}
