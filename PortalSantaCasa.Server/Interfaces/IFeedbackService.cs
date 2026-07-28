using Microsoft.AspNetCore.Mvc.RazorPages;
using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IFeedbackService
    {
        Task<IEnumerable<FeedbackResponseDto>> GetAllAsync(string? targetDepartment);
        Task<IEnumerable<FeedbackResponseDto>> GetAllPaginatedAsync(int page, int perPage, string? targetDepartment);
        Task<int> GetTotalCountAsync(string? targetDepartment);
        Task<FeedbackResponseDto?> GetByIdAsync(int id, string? targetDepartment);
        Task<FeedbackResponseDto> CreateAsync(FeedbackCreateDto dto);
        Task<bool> UpdateAsync(int id, FeedbackUpdateDto dto, string? targetDepartment);
        Task<bool> DeleteAsync(int id, string? targetDepartment);
        Task<bool> MarkAsRead(int id, string? targetDepartment);
    }

}
