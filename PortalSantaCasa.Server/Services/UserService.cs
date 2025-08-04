using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class UserService : IUserService
    {
        private readonly PortalSantaCasaDbContext _context;

        public UserService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<UserResponseDto>> GetAllAsync()
        {
            return await _context.Users
                .Select(n => new UserResponseDto
                {
                    Id = n.Id,
                    Email = n.Email,
                    PhotoUrl = n.PhotoUrl,
                    Senha = n.Senha,
                    UpdatedAt = n.UpdatedAt,
                    IsActive = n.IsActive,
                    CreatedAt = n.CreatedAt,
                    Username = n.Username,
                    UserType = n.UserType
                }).ToListAsync();
        }

        public async Task<UserResponseDto?> GetByIdAsync(int id)
        {
            var n = await _context.Users.FindAsync(id);
            if (n == null) return null;

            return new UserResponseDto
            {
                Id = n.Id,
                Email = n.Email,
                PhotoUrl = n.PhotoUrl,
                Senha = n.Senha,
                UpdatedAt = n.UpdatedAt,
                IsActive = n.IsActive,
                CreatedAt = n.CreatedAt,
                Username = n.Username,
                UserType = n.UserType
            };
        }

        public async Task<UserResponseDto> CreateAsync(UserCreateDto dto)
        {
            var entity = new User
            {
                Email = dto.Email,
                Senha = dto.Senha,
                PhotoUrl = dto.PhotoUrl,
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Username = dto.Username,
                UserType = dto.UserType
            };

            _context.Users.Add(entity);
            await _context.SaveChangesAsync();

            return await GetByIdAsync(entity.Id) ?? throw new Exception("Erro ao criar notícia.");
        }

        public async Task<bool> UpdateAsync(int id, UserUpdateDto dto)
        {
            var n = await _context.Users.FindAsync(id);
            if (n == null) return false;

            n.Email = dto.Email;
            n.Senha = dto.Senha;
            n.PhotoUrl = dto.PhotoUrl;
            n.IsActive = dto.IsActive;
            n.Username = dto.Username;
            n.UserType = dto.UserType;
            n.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var n = await _context.Users.FindAsync(id);
            if (n == null) return false;

            _context.Users.Remove(n);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
