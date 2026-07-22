using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces;

public interface ITacticalReportsService
{
    IReadOnlyList<TacticalReportDefinitionDto> GetCatalog();
    Task<TacticalReportResultDto?> GetReportAsync(string slug, string? agentId, CancellationToken cancellationToken);
}
