using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Utils;
using System;

namespace PortalSantaCasa.Server.Services
{
    public class NotificationService : INotificationService
    {
        private readonly PortalSantaCasaDbContext _context;
        private readonly IHubContext<NotificationHub> _hubContext;

        public NotificationService(PortalSantaCasaDbContext context, IHubContext<NotificationHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        public async Task<List<Notification>> GetAllNotificationsAsync()
        {
            return await _context.Notifications.OrderByDescending(n => n.CreatedAt).ToListAsync();
        }

        public async Task<List<Notification>> GetUnreadNotificationsAsync()
        {
            return await _context.Notifications.Where(n => !n.IsRead).OrderByDescending(n => n.CreatedAt).ToListAsync();
        }

        public async Task<Notification> CreateNotificationAsync(string type, string title, string message, string link = null, DateTime? notificationDate = null)
        {
            var notification = new Notification
            {
                Type = type,
                Title = title,
                Message = message,
                Link = link,
                CreatedAt = DateTime.UtcNow,
                NotificationDate = notificationDate
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            // Enviar via SignalR
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", notification);

            return notification;
        }

        public async Task MarkAsReadAsync(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification != null)
            {
                notification.IsRead = true;
                await _context.SaveChangesAsync();
            }
        }
    }
}
