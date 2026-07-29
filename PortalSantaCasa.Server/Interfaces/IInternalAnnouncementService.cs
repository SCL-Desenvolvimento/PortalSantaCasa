using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IInternalAnnouncementService
    {
        Task<InternalAnnouncementResponseDto> CreateAsync(InternalAnnouncementCreateDto dto);
        Task<InternalAnnouncementResponseDto?> UpdateAsync(int id, InternalAnnouncementUpdateDto dto, int? ownerId = null);
        Task<bool> DeleteAsync(int id, int? ownerId = null);
        Task<InternalAnnouncementResponseDto?> GetByIdAsync(int id);
        Task<IEnumerable<InternalAnnouncementResponseDto>> GetAllAsync(int? ownerId = null);
        Task<IEnumerable<InternalAnnouncementResponseDto>> GetAllPaginatedAsync(int page, int perPage, string status, int? ownerId = null);
        Task<int> GetTotalCountAsync(string status, int? ownerId = null);
        Task<InternalTotalsDto> GetTotalsAsync(int? ownerId = null);
    }
}
