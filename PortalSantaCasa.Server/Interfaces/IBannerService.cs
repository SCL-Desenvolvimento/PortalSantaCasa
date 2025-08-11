using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IBannerService
    {
        Task<IEnumerable<BannerResponseDto>> GetAllAsync();
        Task<BannerResponseDto?> GetByIdAsync(int id);
        Task<BannerResponseDto> CreateAsync(BannerCreateDto dto);
        Task<bool> UpdateAsync(int id, BannerUpdateDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
