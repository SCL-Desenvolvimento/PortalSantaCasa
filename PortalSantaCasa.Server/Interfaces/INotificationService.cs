using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface INotificationService
    {
        // Notificações globais (admin, debug, etc.)
        Task<IEnumerable<NotificationResponseDto>> GetAllNotificationsAsync();
        Task<NotificationResponseDto> CreateNotificationAsync(NotificationCreateDto dto);

        // Notificações por usuário
        Task<IEnumerable<NotificationResponseDto>> GetUserNotificationsAsync(int userId);
        Task<IEnumerable<NotificationResponseDto>> GetUnreadUserNotificationsAsync(int userId);
        Task<int> GetUnreadCountAsync(int userId);

        Task MarkAsReadAsync(int notificationId, int userId);
        Task MarkAllAsReadAsync(int userId);
    }
}

