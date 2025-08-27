using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
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

        public async Task<IEnumerable<BirthdayResponseDto>> GetAllPaginatedAsync(int page, int perPage)
        {
            return await _context.Birthdays
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
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
                PhotoUrl = await ProcessarMidiasAsync(dto.File),
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

            if (!string.IsNullOrEmpty(b.PhotoUrl) && dto.File != null)
            {
                if (File.Exists(b.PhotoUrl))
                    File.Delete(b.PhotoUrl);
            }

            if (dto.File != null)
                b.PhotoUrl = await ProcessarMidiasAsync(dto.File);

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

        public async Task<IEnumerable<BirthdayResponseDto>> GetNextBirthdays()
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            var endDate = today.AddDays(30);

            var birthdays = await _context.Birthdays
                .ToListAsync();

            var result = birthdays
                .Where(b =>
                {
                    var birthdayThisYear = new DateOnly(today.Year, b.BirthDate.Month, b.BirthDate.Day);

                    if (birthdayThisYear < today)
                        birthdayThisYear = new DateOnly(today.Year + 1, b.BirthDate.Month, b.BirthDate.Day);

                    var daysUntilBirthday = birthdayThisYear.DayNumber - today.DayNumber;
                    return daysUntilBirthday >= 0 && daysUntilBirthday <= 30;
                })
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
                })
                .OrderBy(b => b.BirthDate.Month)
                .ThenBy(b => b.BirthDate.Day)
                .ToList();

            return result;
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
