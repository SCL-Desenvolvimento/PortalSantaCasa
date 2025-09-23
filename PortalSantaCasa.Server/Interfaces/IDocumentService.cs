using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IDocumentService
    {
        Task<IEnumerable<DocumentResponseDto>> GetAllAsync();
        Task<DocumentResponseDto?> GetByIdAsync(int id);
        Task<DocumentResponseDto> CreateAsync(DocumentCreateDto dto);
        Task<bool> UpdateAsync(int id, DocumentUpdateDto dto);
        Task<bool> DeleteAsync(int id);
        Task<IEnumerable<DocumentResponseDto>> SearchAsync(string query);
    }
}

