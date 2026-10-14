using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces;

public interface IPjDirectory
{
    Task<EmployeeIdentityDto?> FindAsync(string cpf, CancellationToken cancellationToken = default);
}
