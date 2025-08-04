using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IMenuService
    {
        Task<IEnumerable<MenuResponseDto>> GetAllAsync();
        Task<MenuResponseDto?> GetByIdAsync(int id);
        Task<MenuResponseDto> CreateAsync(MenuCreateDto dto);
        Task<bool> UpdateAsync(int id, MenuUpdateDto dto);
        Task<bool> DeleteAsync(int id);
    }

}
