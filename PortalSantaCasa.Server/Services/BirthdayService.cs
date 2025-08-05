using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class BirthdayService : IBirthdayService
    {
        private readonly PortalSantaCasaDbContext _context;

        public BirthdayService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<BirthdayResponseDto>> GetAllAsync()
        {
            return await _context.Birthdays
                .Select(b => new BirthdayResponseDto
                {
                    Id = b.Id,
                    Name = b.Name,
                    BirthDate = b.BirthDate,
                    Department = b.Department,
                    Position = b.Position,
                    PhotoUrl = b.PhotoUrl,
                    IsActive = b.IsActive,
                    CreatedAt = b.CreatedAt
                }).ToListAsync();
        }

        public async Task<BirthdayResponseDto?> GetByIdAsync(int id)
        {
            var b = await _context.Birthdays.FindAsync(id);
            if (b == null) return null;

            return new BirthdayResponseDto
            {
                Id = b.Id,
                Name = b.Name,
                BirthDate = b.BirthDate,
                Department = b.Department,
                Position = b.Position,
                PhotoUrl = b.PhotoUrl,
                IsActive = b.IsActive,
                CreatedAt = b.CreatedAt
            };
        }

        public async Task<BirthdayResponseDto> CreateAsync([FromForm] BirthdayCreateDto dto)
        {
            var entity = new Birthday
            {
                Name = dto.Name,
                BirthDate = dto.BirthDate,
                Department = dto.Department,
                Position = dto.Position,
                PhotoUrl = await ProcessarMidiasAsync(dto.PhotoUrl),
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.Birthdays.Add(entity);
            await _context.SaveChangesAsync();

            return await GetByIdAsync(entity.Id) ?? throw new Exception("Erro ao criar");
        }

        public async Task<bool> UpdateAsync(int id, [FromForm] BirthdayUpdateDto dto)
        {
            var b = await _context.Birthdays.FindAsync(id);
            if (b == null) return false;

            b.Name = dto.Name;
            b.BirthDate = dto.BirthDate;
            b.Department = dto.Department;
            b.Position = dto.Position;
            b.IsActive = dto.IsActive;

            if (!string.IsNullOrEmpty(b.PhotoUrl) && dto.PhotoUrl != null)
            {
                if (File.Exists(b.PhotoUrl))
                    File.Delete(b.PhotoUrl);
            }

            if (dto.PhotoUrl != null)
                b.PhotoUrl = await ProcessarMidiasAsync(dto.PhotoUrl);

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var b = await _context.Birthdays.FindAsync(id);
            if (b == null) return false;

            if (File.Exists(b.PhotoUrl))
                File.Delete(b.PhotoUrl);

            _context.Birthdays.Remove(b);
            await _context.SaveChangesAsync();
            return true;
        }

        private static async Task<string?> ProcessarMidiasAsync(IFormFile midia)
        {
            if (midia == null) return null;

            // Define o caminho para a pasta "Aniversariantes"
            var baseDirectory = Path.Combine("Uploads", "Aniversariantes").Replace("\\", "/");

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
