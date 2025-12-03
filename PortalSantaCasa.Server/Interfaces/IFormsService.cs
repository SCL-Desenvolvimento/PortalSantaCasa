using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IFormsService
    {
        Task<IEnumerable<FormsResponseDto>> GetAllAsync();
        Task<FormsResponseDto?> GetByIdAsync(int id);
        Task<FormsResponseDto> CreateAsync(FormsCreateDto dto);
        Task<FormsResponseDto?> UpdateAsync(int id, FormsUpdateDto dto);
        Task<bool> DeleteAsync(int id);
    }
}