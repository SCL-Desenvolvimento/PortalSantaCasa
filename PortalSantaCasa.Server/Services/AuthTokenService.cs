using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class AuthTokenService : IAuthTokenService
    {
        private readonly PortalSantaCasaDbContext _context;

        public AuthTokenService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task<AuthToken> CreateOrUpdateAsync(AuthToken token)
        {
            var existingToken = await _context.AuthTokens
                .FirstOrDefaultAsync(t => t.Provider == token.Provider && t.AccountId == token.AccountId);

            if (existingToken == null)
            {
                _context.AuthTokens.Add(token);
            }
            else
            {
                existingToken.AccessToken = token.AccessToken;
                existingToken.RefreshToken = token.RefreshToken;
                existingToken.ExpiresAtUtc = token.ExpiresAtUtc;
                existingToken.LastRefreshedAtUtc = DateTime.UtcNow;
                existingToken.Scopes = token.Scopes;
                existingToken.IsActive = token.IsActive;
                existingToken.ErrorMessage = token.ErrorMessage;
                existingToken.RefreshAttempts = token.RefreshAttempts;
                existingToken.ProviderMetadata = token.ProviderMetadata;
                _context.AuthTokens.Update(existingToken);
            }
            await _context.SaveChangesAsync();
            return existingToken ?? token;
        }

        public async Task<AuthToken?> GetActiveTokenAsync(string provider, string accountId)
        {
            return await _context.AuthTokens
                .FirstOrDefaultAsync(t => t.Provider == provider && t.AccountId == accountId && t.IsActive && t.ExpiresAtUtc > DateTime.UtcNow);
        }

        public async Task<IEnumerable<AuthToken>> GetExpiringTokensAsync()
        {
            // Tokens que expiram em menos de 24 horas e que possuem refresh token
            return await _context.AuthTokens
                .Where(t => t.IsActive && t.RefreshToken != null && t.ExpiresAtUtc <= DateTime.UtcNow.AddHours(24))
                .ToListAsync();
        }

        public async Task RefreshTokenAsync(AuthToken token)
        {
            _context.AuthTokens.Update(token);
            await _context.SaveChangesAsync();
        }

        public async Task DeactivateTokenAsync(int id)
        {
            var token = await _context.AuthTokens.FindAsync(id);
            if (token != null)
            {
                token.IsActive = false;
                token.ErrorMessage = "Token deactivated by user or system.";
                _context.AuthTokens.Update(token);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<AuthToken>> GetAllActiveTokensAsync()
        {
            return await _context.AuthTokens
                .Where(t => t.IsActive)
                .ToListAsync();
        }
    }
}
