using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface INewsService
    {
        Task<IEnumerable<NewsResponseDto>> GetAllAsync(int? ownerId = null);
        Task<IEnumerable<NewsResponseDto>> GetAllPaginatedAsync(int page, int perPage, bool? isQualityMinute, string status, int? ownerId = null);
        Task<int> GetTotalCountAsync(bool? isQualityMinute, string status, int? ownerId = null);
        Task<NewsResponseDto?> GetByIdAsync(int id);
        Task<NewsResponseDto> CreateAsync(NewsCreateDto dto);
        Task<bool> UpdateAsync(int id, NewsUpdateDto dto, int? ownerId = null);
        Task<bool> DeleteAsync(int id, int? ownerId = null);
        Task<IEnumerable<NewsResponseDto>> SearchAsync(string query, int? ownerId = null, bool activeOnly = true);
        Task<NewsTotalsDto> GetTotalsAsync(bool? isQualityMinute, int? ownerId = null);
    }
}
