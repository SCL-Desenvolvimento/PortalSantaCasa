using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IUserService
    {
        Task<IEnumerable<UserResponseDto>> GetAllAsync();
        Task<IEnumerable<UserResponseDto>> GetAllPaginatedAsync(int page, int perPage);
        Task<UserResponseDto?> GetByIdAsync(int id);
        Task<UserResponseDto> CreateAsync(UserCreateDto dto);
        Task<bool> UpdateAsync(int id, UserUpdateDto dto);
        Task<bool> DeleteAsync(int id);
        Task<bool> ResetPasswordAsync(int id);
        Task<bool> ChangePasswordAsync(int id, string newPassword);
        Task<IEnumerable<UserResponseDto>> SearchAsync(string query);
        Task<UserResponseDto?> GetByUsernameAsync(string username);
    }
}
