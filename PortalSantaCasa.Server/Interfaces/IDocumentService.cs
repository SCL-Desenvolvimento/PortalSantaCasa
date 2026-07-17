using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Interfaces;

public interface IDocumentService
{
    Task<IEnumerable<DocumentResponseDto>> GetAllAsync(string role, bool includeInactive = false);
    Task<DocumentResponseDto?> GetByIdAsync(int id, string role, bool includeInactive = false);
    Task<DocumentResponseDto> CreateAsync(DocumentCreateDto dto, string role);
    Task<bool> UpdateAsync(int id, DocumentUpdateDto dto, string role);
    Task<bool> DeleteAsync(int id);
    Task<IEnumerable<DocumentResponseDto>> SearchAsync(string query, string role, bool includeInactive = false);
    Task<Document?> GetAccessibleFileAsync(int id, string role);
}
