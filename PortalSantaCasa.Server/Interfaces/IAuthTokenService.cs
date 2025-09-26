using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IAuthTokenService
    {
        Task<AuthToken> CreateOrUpdateAsync(AuthToken token);
        Task<AuthToken?> GetActiveTokenAsync(string provider, string accountId);
        Task<IEnumerable<AuthToken>> GetExpiringTokensAsync();
        Task RefreshTokenAsync(AuthToken token);
        Task DeactivateTokenAsync(int id);
        Task<IEnumerable<AuthToken>> GetAllActiveTokensAsync();
    }
}
