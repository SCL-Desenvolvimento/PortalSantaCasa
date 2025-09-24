using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Utils;

public class NotificationService : INotificationService
{
    private readonly PortalSantaCasaDbContext _context;
    private readonly IHubContext<NotificationHub> _hubContext;

    public NotificationService(PortalSantaCasaDbContext context, IHubContext<NotificationHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    public async Task<IEnumerable<NotificationResponseDto>> GetAllNotificationsAsync()
    {
        return await _context.Notifications
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new NotificationResponseDto
            {
                Id = n.Id,
                Type = n.Type,
                Title = n.Title,
                Message = n.Message,
                Link = n.Link,
                CreatedAt = n.CreatedAt,
                NotificationDate = n.NotificationDate
            })
            .ToListAsync();
    }

    public async Task<NotificationResponseDto> CreateNotificationAsync(NotificationCreateDto dto)
    {
        var notification = new Notification
        {
            Type = dto.Type,
            Title = dto.Title,
            Message = dto.Message,
            Link = dto.Link,
            IsGlobal = dto.IsGlobal,
            NotificationDate = dto.NotificationDate,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        if (!dto.IsGlobal && dto.TargetDepartment != string.Empty)
        {
            var usersInSector = await _context.Users
                .Where(u => u.Department == dto.TargetDepartment)
                .ToListAsync();

            foreach (var user in usersInSector)
            {
                _context.UserNotifications.Add(new UserNotification
                {
                    UserId = user.Id,
                    NotificationId = notification.Id,
                    IsRead = false
                });
            }

            await _context.SaveChangesAsync();
        }


        await _context.SaveChangesAsync();

        var response = new NotificationResponseDto
        {
            Id = notification.Id,
            Type = notification.Type,
            Title = notification.Title,
            Message = notification.Message,
            Link = notification.Link,
            CreatedAt = notification.CreatedAt,
            NotificationDate = notification.CreatedAt
        };

        await _hubContext.Clients.All.SendAsync("ReceiveNotification", response);

        return response;
    }

    public async Task<IEnumerable<NotificationResponseDto>> GetUserNotificationsAsync(int userId)
    {
        var globalNotifications = await _context.Notifications
            .Where(n => n.IsGlobal && !_context.UserNotifications.Any(un => un.NotificationId == n.Id && un.UserId == userId))
            .ToListAsync();

        foreach (var n in globalNotifications)
        {
            _context.UserNotifications.Add(new UserNotification
            {
                UserId = userId,
                NotificationId = n.Id,
                IsRead = false
            });
        }

        if (globalNotifications.Any())
            await _context.SaveChangesAsync();

        return await _context.UserNotifications
            .Where(un => un.UserId == userId)
            .Include(un => un.Notification)
            .OrderByDescending(un => un.Notification.CreatedAt)
            .Select(un => new NotificationResponseDto
            {
                Id = un.NotificationId,
                Type = un.Notification.Type,
                Title = un.Notification.Title,
                Message = un.Notification.Message,
                Link = un.Notification.Link,
                CreatedAt = un.Notification.CreatedAt,
                NotificationDate = un.Notification.NotificationDate,
                IsRead = un.IsRead
            })
            .ToListAsync();
    }
    
    public async Task<IEnumerable<NotificationResponseDto>> GetUnreadUserNotificationsAsync(int userId)
    {
        return await _context.UserNotifications
            .Where(un => un.UserId == userId && !un.IsRead)
            .Include(un => un.Notification)
            .OrderByDescending(un => un.Notification.CreatedAt)
            .Select(un => new NotificationResponseDto
            {
                Id = un.NotificationId,
                Type = un.Notification.Type,
                Title = un.Notification.Title,
                Message = un.Notification.Message,
                Link = un.Notification.Link,
                CreatedAt = un.Notification.CreatedAt,
                NotificationDate = un.Notification.NotificationDate,
                IsRead = un.IsRead
            })
            .ToListAsync();
    }

    public async Task<int> GetUnreadCountAsync(int userId)
    {
        return await _context.UserNotifications
            .CountAsync(un => un.UserId == userId && !un.IsRead);
    }

    public async Task MarkAsReadAsync(int notificationId, int userId)
    {
        var userNotification = await _context.UserNotifications
            .FirstOrDefaultAsync(un => un.NotificationId == notificationId && un.UserId == userId);

        if (userNotification != null)
        {
            userNotification.IsRead = true;
            await _context.SaveChangesAsync();
        }
    }

    public async Task MarkAllAsReadAsync(int userId)
    {
        var userNotifications = await _context.UserNotifications
            .Where(un => un.UserId == userId && !un.IsRead)
            .ToListAsync();

        foreach (var un in userNotifications)
            un.IsRead = true;

        if (userNotifications.Any())
            await _context.SaveChangesAsync();
    }
}
