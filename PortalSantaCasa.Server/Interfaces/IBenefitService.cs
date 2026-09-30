using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Interfaces;

public interface IBenefitService
{
    Task<IEnumerable<Benefit>> GetPublicAsync();
    Task<IEnumerable<Benefit>> GetAdminAsync();
    Task<Benefit> CreateAsync(BenefitDto dto);
    Task<Benefit?> UpdateAsync(int id, BenefitDto dto);
    Task<bool> DeleteAsync(int id);
}
