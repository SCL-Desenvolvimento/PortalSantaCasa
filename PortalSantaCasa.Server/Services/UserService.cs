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
                Senha = dto.Senha == null ? "MV" : dto.Senha,
                PhotoUrl = dto.File == null ? "Uploads/Usuarios/padrao.png" : await ProcessarMidiasAsync(dto.File),
                IsActive = dto.IsActive,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Username = dto.Username,
                UserType = dto.UserType
            };

            _context.Users.Add(entity);
            await _context.SaveChangesAsync();

            return await GetByIdAsync(entity.Id) ?? throw new Exception("Erro ao criar usuário.");
        }

        public async Task<bool> UpdateAsync(int id, UserUpdateDto dto)
        {
            var n = await _context.Users.FindAsync(id);
            if (n == null) return false;

            n.Email = dto.Email;
            n.Senha = dto.Senha ?? n.Senha;
            n.IsActive = dto.IsActive;
            n.Username = dto.Username;
            n.UserType = dto.UserType;
            n.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrEmpty(n.PhotoUrl) && dto.File != null)
            {
                if (File.Exists(n.PhotoUrl) && n.PhotoUrl != "Uploads/Usuarios/padrao.png")
                {
                    File.Delete(n.PhotoUrl);
                }
            }

            if (dto.File != null)
            {
                n.PhotoUrl = await ProcessarMidiasAsync(dto.File);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var n = await _context.Users.FindAsync(id);
            if (n == null) return false;

            if (File.Exists(n.PhotoUrl) && n.PhotoUrl != "Uploads/Usuarios/padrao.png")
                File.Delete(n.PhotoUrl);

            _context.Users.Remove(n);
            await _context.SaveChangesAsync();
            return true;
        }

        private static async Task<string?> ProcessarMidiasAsync(IFormFile midia)
        {
            if (midia == null) return null;

            // Define o caminho para a pasta "Usuarios"
            var baseDirectory = Path.Combine("Uploads", "Usuarios").Replace("\\", "/");

            // Verifica se a pasta "Usuarios" existe, e a cria caso não exista
            if (!Directory.Exists(baseDirectory))
            {
                Directory.CreateDirectory(baseDirectory);
            }

            // Gera o caminho completo para o arquivo dentro da pasta "Usuarios"
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
