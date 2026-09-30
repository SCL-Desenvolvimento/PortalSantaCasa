using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces;

public interface IAuthService
{
    Task<string> RegisterAsync(UserCreateDto dto, bool isSuperAdmin);
    Task<AuthLoginResultDto> LoginAsync(LoginDto dto);
    Task ChangeInitialPasswordAsync(int userId, string newPassword);
}
