using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IBirthdayService
    {
        Task<IEnumerable<BirthdayResponseDto>> GetAllAsync();
        Task<BirthdayResponseDto?> GetByIdAsync(int id);
        Task<BirthdayResponseDto> CreateAsync(BirthdayCreateDto dto);
        Task<bool> UpdateAsync(int id, BirthdayUpdateDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
