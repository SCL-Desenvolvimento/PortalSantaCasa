using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;

namespace PortalSantaCasa.Server.Security;

/// <summary>Concede ao Super Administrador as permissões já atribuídas ao Administrador.</summary>
public sealed class SuperAdminClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        var isSuperAdmin = principal.Claims.Any(claim =>
            claim.Type == "role" &&
            string.Equals(claim.Value, "superadmin", StringComparison.OrdinalIgnoreCase));

        if (isSuperAdmin && !principal.IsInRole("admin"))
        {
            var identity = principal.Identities.FirstOrDefault(identity => identity.IsAuthenticated);
            identity?.AddClaim(new Claim("role", "admin"));
        }

        return Task.FromResult(principal);
    }
}
