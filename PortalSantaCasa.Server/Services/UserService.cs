using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using System.Collections.Concurrent;

namespace PortalSantaCasa.Server.Services
{
    public class UserService : IUserService
    {
        private readonly PortalSantaCasaDbContext _context;
        private readonly IPasswordHasher<object> _passwordHasher;
        private static readonly ConcurrentDictionary<int, HashSet<string>> _connectionsPerUser = new();

        public UserService(PortalSantaCasaDbContext context, IPasswordHasher<object> passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
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
                    Department = n.Department,
                    UpdatedAt = n.UpdatedAt,
                    IsActive = n.IsActive,
                    CreatedAt = n.CreatedAt,
                    Username = n.Username,
                    UserType = n.UserType
                }).ToListAsync();
        }

        public async Task<IEnumerable<UserResponseDto>> GetAllPaginatedAsync(int page, int perPage)
        {
            return await _context.Users
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * perPage)
                .Take(perPage)
                .Select(n => new UserResponseDto
                {
                    Id = n.Id,
                    Email = n.Email,
                    PhotoUrl = n.PhotoUrl,
                    Senha = n.Senha,
                    Department = n.Department,
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
                Department = n.Department,
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
                Senha = _passwordHasher.HashPassword(null!, dto.Senha ?? "MV"),
                PhotoUrl = dto.File == null ? "Uploads/Usuarios/default-user.png" : await ProcessarMidiasAsync(dto.File),
                IsActive = dto.IsActive,
                Department = dto.Department,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
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
            n.Department = dto.Department;
            n.IsActive = dto.IsActive;
            n.Username = dto.Username;
            n.UserType = dto.UserType;
            n.UpdatedAt = DateTimeOffset.UtcNow;

            if (!string.IsNullOrEmpty(dto.Senha))
            {
                _passwordHasher.HashPassword(null!, dto.Senha);
            }

            if (!string.IsNullOrEmpty(n.PhotoUrl) && dto.File != null)
            {
                if (File.Exists(n.PhotoUrl) && n.PhotoUrl != "Uploads/Usuarios/default-user.png")
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

            if (File.Exists(n.PhotoUrl) && n.PhotoUrl != "Uploads/Usuarios/default-user.png")
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

        public async Task<bool> ResetPasswordAsync(int id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
                return false;

            user.Senha = _passwordHasher.HashPassword(null!, "MV");
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> ChangePasswordAsync(int id, string newPassword)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
                return false;

            user.Senha = _passwordHasher.HashPassword(null!, newPassword);
            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<IEnumerable<UserResponseDto>> SearchAsync(string query)
        {
            return await _context.Users
                .Where(u => u.Username.ToLower().Contains(query.ToLower()) ||
                            u.Email.ToLower().Contains(query.ToLower()) ||
                            u.Department.ToLower().Contains(query.ToLower()))
                .Select(n => new UserResponseDto
                {
                    Id = n.Id,
                    Email = n.Email,
                    PhotoUrl = n.PhotoUrl,
                    Senha = n.Senha,
                    Department = n.Department,
                    UpdatedAt = n.UpdatedAt,
                    IsActive = n.IsActive,
                    CreatedAt = n.CreatedAt,
                    Username = n.Username,
                    UserType = n.UserType
                }).ToListAsync();
        }

        public async Task<UserResponseDto?> GetByUsernameAsync(string username)
        {
            var n = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
            if (n == null) return null;

            return new UserResponseDto
            {
                Id = n.Id,
                Email = n.Email,
                PhotoUrl = n.PhotoUrl,
                Senha = n.Senha,
                Department = n.Department,
                UpdatedAt = n.UpdatedAt,
                IsActive = n.IsActive,
                CreatedAt = n.CreatedAt,
                Username = n.Username,
                UserType = n.UserType
            };

        }


        public async Task UpdateActivityAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return;

            user.LastActivityUtc = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<User>> GetOnlineUsersAsync(TimeSpan onlineThreshold)
        {
            var cutoff = DateTimeOffset.UtcNow - onlineThreshold;
            return await _context.Users
                .Where(u => u.LastActivityUtc >= cutoff)
                .ToListAsync();
        }

        public async Task SetUserOfflineAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return;
            // definir como antigo para forçar offline
            user.LastActivityUtc = DateTime.MinValue;
            await _context.SaveChangesAsync();
        }

        // métodos para manipular mapa local de conexões (usados pelo Hub)
        public void AddConnection(int userId, string connectionId)
        {
            var set = _connectionsPerUser.GetOrAdd(userId, _ => new HashSet<string>());
            lock (set)
            {
                set.Add(connectionId);
            }
        }

        public void RemoveConnection(int userId, string connectionId)
        {
            if (_connectionsPerUser.TryGetValue(userId, out var set))
            {
                lock (set)
                {
                    set.Remove(connectionId);
                    if (set.Count == 0)
                    {
                        _connectionsPerUser.TryRemove(userId, out _);
                    }
                }
            }
        }

        public bool IsUserConnected(int userId)
        {
            return _connectionsPerUser.TryGetValue(userId, out var set) && set.Count > 0;
        }

    }
}
