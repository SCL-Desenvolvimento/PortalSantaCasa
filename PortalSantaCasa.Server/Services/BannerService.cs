using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class BannerService : IBannerService
    {
        private readonly PortalSantaCasaDbContext _context;

        public BannerService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<BannerResponseDto>> GetAllAsync()
        {
            return await _context.Banners
                .Where(b => b.IsActive)
                .OrderBy(b => b.Order)
                .Select(b => new BannerResponseDto
                {
                    Id = b.Id,
                    IsActive = b.IsActive,
                    Order = b.Order,
                    ImageUrl = b.ImageUrl,
                    TimeSeconds = b.TimeSeconds,
                    Title = b.Title,
                    Description = b.Description,
                    NewsId = b.NewsId
                }).ToListAsync();
        }

        public async Task<BannerResponseDto?> GetByIdAsync(int id)
        {
            var b = await _context.Banners.FindAsync(id);
            if (b == null) return null;

            return new BannerResponseDto
            {
                Id = b.Id,
                IsActive = b.IsActive,
                Order = b.Order,
                ImageUrl = b.ImageUrl,
                TimeSeconds = b.TimeSeconds,
                Title = b.Title,
                Description = b.Description,
                NewsId = b.NewsId
            };
        }

        public async Task<BannerResponseDto> CreateAsync(BannerCreateDto dto)
        {
            var entity = new Banner
            {
                IsActive = dto.IsActive,
                Order = dto.Order,
                ImageUrl = await ProcessarMidiasAsync(dto.File),
                TimeSeconds = dto.TimeSeconds,
                Title = dto.Title,
                Description = dto.Description,
                NewsId = dto.NewsId
            };

            _context.Banners.Add(entity);
            await _context.SaveChangesAsync();

            return await GetByIdAsync(entity.Id) ?? throw new Exception("Erro ao criar");
        }

        public async Task<bool> UpdateAsync(int id, BannerUpdateDto dto)
        {
            var b = await _context.Banners.FindAsync(id);
            if (b == null) return false;

            b.IsActive = dto.IsActive;
            b.Order = dto.Order;
            b.TimeSeconds = dto.TimeSeconds;
            b.Title = dto.Title;
            b.Description = dto.Description;
            b.NewsId = dto.NewsId;

            if (!string.IsNullOrEmpty(b.ImageUrl) && dto.File != null)
            {
                if (File.Exists(b.ImageUrl))
                    File.Delete(b.ImageUrl);
            }

            if (dto.File != null)
                b.ImageUrl = await ProcessarMidiasAsync(dto.File);

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var b = await _context.Banners.FindAsync(id);
            if (b == null) return false;

            if (File.Exists(b.ImageUrl))
                File.Delete(b.ImageUrl);

            _context.Banners.Remove(b);
            await _context.SaveChangesAsync();
            return true;
        }

        private static async Task<string?> ProcessarMidiasAsync(IFormFile midia)
        {
            if (midia == null) return null;

            // Define o caminho para a pasta "Aniversariantes"
            var baseDirectory = Path.Combine("Uploads", "BannerHome").Replace("\\", "/");

            // Verifica se a pasta "Aniversariantes" existe, e a cria caso não exista
            if (!Directory.Exists(baseDirectory))
            {
                Directory.CreateDirectory(baseDirectory);
            }

            // Gera o caminho completo para o arquivo dentro da pasta "Aniversariantes"
            var filePath = Path.Combine(baseDirectory, Guid.NewGuid() + Path.GetExtension(midia.FileName)).Replace("\\", "/");

            // Salva o arquivo no caminho especificado
            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await midia.CopyToAsync(stream);
            }

            return filePath;
        }

    }

}
