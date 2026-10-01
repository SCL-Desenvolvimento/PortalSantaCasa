using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces;

public interface IEmployeeDirectory
{
    Task<EmployeeIdentityDto?> FindAsync(string chapa, CancellationToken cancellationToken = default);
}
