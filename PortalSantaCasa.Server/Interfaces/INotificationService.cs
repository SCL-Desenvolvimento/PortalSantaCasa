using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface INotificationService
    {
        Task<List<Notification>> GetAllNotificationsAsync();
        Task<List<Notification>> GetUnreadNotificationsAsync();
        Task<Notification> CreateNotificationAsync(string type, string title, string message, string link, DateTime? notificationDate = null);
        Task MarkAsReadAsync(int id);
    }
}

