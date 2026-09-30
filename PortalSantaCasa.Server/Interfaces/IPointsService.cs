using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces;

public interface IPointsService
{
    Task<RegisterPointsResponseDto> RegisterAsync(RegisterPointsDto dto);
    Task<IEnumerable<RankingDto>> GetRankingAsync(int limit);
    Task<IEnumerable<PointEventResponseDto>> GetEventsAsync(string? re, string? eventType, string? referenceId, int page, int pageSize);
    Task<IEnumerable<PointRuleDto>> GetRulesAsync();
    Task<PointRuleDto?> UpdateRuleAsync(int id, UpdatePointRuleDto dto);
}
