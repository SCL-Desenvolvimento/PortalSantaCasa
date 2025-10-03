using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IInternalAnnouncementService
    {
        Task<InternalAnnouncementResponseDto> CreateAsync(InternalAnnouncementCreateDto dto);
        Task<InternalAnnouncementResponseDto?> UpdateAsync(int id, InternalAnnouncementUpdateDto dto);
        Task<bool> DeleteAsync(int id);
        Task<InternalAnnouncementResponseDto?> GetByIdAsync(int id);
        Task<IEnumerable<InternalAnnouncementResponseDto>> GetAllAsync();
        Task<IEnumerable<InternalAnnouncementResponseDto>> GetAllPaginatedAsync(int page, int perPage);
        Task<int> GetTotalCountAsync();
    }
}
