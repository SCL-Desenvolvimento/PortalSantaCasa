using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IFeedbackService
    {
        Task<IEnumerable<FeedbackResponseDto>> GetAllAsync();
        Task<FeedbackResponseDto?> GetByIdAsync(int id);
        Task<FeedbackResponseDto> CreateAsync(FeedbackCreateDto dto);
        Task<bool> UpdateAsync(int id, FeedbackUpdateDto dto);
        Task<bool> DeleteAsync(int id);
        Task MarkAsRead(int id);
    }

}
