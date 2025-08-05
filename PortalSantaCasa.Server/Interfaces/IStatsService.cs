using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IStatsService
    {
        Task<StatsDto> GetStatsAsync();
    }
}
