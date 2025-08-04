using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface INewsService
    {
        Task<IEnumerable<NewsResponseDto>> GetAllAsync();
        Task<NewsResponseDto?> GetByIdAsync(int id);
        Task<NewsResponseDto> CreateAsync(NewsCreateDto dto);
        Task<bool> UpdateAsync(int id, NewsUpdateDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
