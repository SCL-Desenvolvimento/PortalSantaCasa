using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces;

public interface IPublicAccessLogService
{
    Task<PublicAccessLogResponseDto> CreateAsync(PublicAccessLogCreateDto dto, string? ipAddress, string userAgent);
    Task<IEnumerable<PublicAccessLogContentOptionDto>> GetContentOptionsAsync(string pageType);
    Task<PublicAccessLogReportDto> GetReportAsync(PublicAccessLogReportQueryDto query);
}
