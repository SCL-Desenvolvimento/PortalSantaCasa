using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IEventService
    {
        Task<IEnumerable<EventResponseDto>> GetAllAsync();
        Task<IEnumerable<EventResponseDto>> GetAllPaginatedAsync(int page, int perPage);
        Task<IEnumerable<EventResponseDto>> GetNextEvents();
        Task<EventResponseDto?> GetByIdAsync(int id);
        Task<EventResponseDto> CreateAsync(EventCreateDto dto);
        Task<bool> UpdateAsync(int id, EventUpdateDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
