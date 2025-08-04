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

        public async Task<BirthdayResponseDto> CreateAsync(BirthdayCreateDto dto)
        {
            var entity = new Birthday
            {
                Name = dto.Name,
                BirthDate = dto.BirthDate,
                Department = dto.Department,
                Position = dto.Position,
                PhotoUrl = dto.PhotoUrl,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.Birthdays.Add(entity);
            await _context.SaveChangesAsync();

            return await GetByIdAsync(entity.Id) ?? throw new Exception("Erro ao criar");
        }

        public async Task<bool> UpdateAsync(int id, BirthdayUpdateDto dto)
        {
            var b = await _context.Birthdays.FindAsync(id);
            if (b == null) return false;

            b.Name = dto.Name;
            b.BirthDate = dto.BirthDate;
            b.Department = dto.Department;
            b.Position = dto.Position;
            b.PhotoUrl = dto.PhotoUrl;
            b.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var b = await _context.Birthdays.FindAsync(id);
            if (b == null) return false;

            _context.Birthdays.Remove(b);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
