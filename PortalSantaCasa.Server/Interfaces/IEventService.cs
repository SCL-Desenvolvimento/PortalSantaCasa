using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IEventService
    {
        Task<IEnumerable<EventResponseDto>> GetAllAsync(int? ownerId = null);
        Task<IEnumerable<EventResponseDto>> GetAllPaginatedAsync(int page, int perPage, int? ownerId = null);
        Task<int> GetTotalCountAsync(int? ownerId = null);
        Task<IEnumerable<EventResponseDto>> GetNextEvents();
        Task<EventResponseDto?> GetByIdAsync(int id, int? ownerId = null);
        Task<EventResponseDto> CreateAsync(EventCreateDto dto);
        Task<bool> UpdateAsync(int id, EventUpdateDto dto, int? ownerId = null);
        Task<bool> DeleteAsync(int id, int? ownerId = null);
        Task<IEnumerable<EventResponseDto>> SearchAsync(string query);
    }
}
