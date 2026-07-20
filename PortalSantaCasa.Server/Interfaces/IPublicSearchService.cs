using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces;

public interface IPublicSearchService
{
    Task<IReadOnlyCollection<PublicSearchResultDto>> SearchAsync(string query, string documentRole);
}
