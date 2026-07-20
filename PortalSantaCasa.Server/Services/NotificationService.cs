using MassTransit;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Shared.DTOs.Notifications;
using PortalSantaCasa.Shared.Events.Notifications;

public class NotificationService : INotificationService
{
    private static readonly DateTimeOffset DismissedMarker = DateTimeOffset.UnixEpoch;
    private readonly PortalSantaCasaDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;

    public NotificationService(
        PortalSantaCasaDbContext context,
        IPublishEndpoint publishEndpoint)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
    }

    public async Task<IEnumerable<NotificationResponseDto>> GetAllNotificationsAsync()
    {
        return await _context.Notifications
            .AsNoTracking()
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
            CreatedAt = DateTimeOffset.UtcNow,
            TargetDepartment = dto.TargetDepartment
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        var userIds = new List<int>();

        if (!dto.IsGlobal && !string.IsNullOrWhiteSpace(dto.TargetDepartment))
        {
            userIds = await _context.Users
                .AsNoTracking()
                .Where(u => u.Department == dto.TargetDepartment)
                .Select(u => u.Id)
                .ToListAsync();

            _context.UserNotifications.AddRange(
                userIds.Select(userId => new UserNotification
                {
                    UserId = userId,
                    NotificationId = notification.Id,
                    IsRead = false
                }));

            await _context.SaveChangesAsync();
        }

        var response = new NotificationResponseDto
        {
            Id = notification.Id,
            Type = notification.Type,
            Title = notification.Title,
            Message = notification.Message,
            Link = notification.Link,
            CreatedAt = notification.CreatedAt,
            NotificationDate = notification.NotificationDate
        };

        await _publishEndpoint.Publish(new NotificationCreatedEvent
        {
            IsGlobal = dto.IsGlobal,
            UserIds = userIds,
            Notification = new NotificationDto
            {
                Id = response.Id,
                Type = response.Type,
                Title = response.Title,
                Message = response.Message,
                Link = response.Link,
                CreatedAt = response.CreatedAt,
                NotificationDate = response.NotificationDate,
                IsRead = response.IsRead
            }
        });

        return response;
    }

    public async Task DeleteBySourceAsync(string type, string sourceLink)
    {
        var notifications = await _context.Notifications
            .Include(notification => notification.UserNotifications)
            .Where(notification =>
                notification.Type == type && notification.Link == sourceLink)
            .ToListAsync();

        if (notifications.Count == 0)
            return;

        var notificationIds = notifications.Select(notification => notification.Id).ToArray();
        _context.UserNotifications.RemoveRange(notifications.SelectMany(notification => notification.UserNotifications));
        _context.Notifications.RemoveRange(notifications);
        await _context.SaveChangesAsync();

        await _publishEndpoint.Publish(new NotificationDeletedEvent
        {
            NotificationIds = notificationIds
        });
    }

    public async Task<IEnumerable<NotificationResponseDto>> GetUserNotificationsAsync(int userId)
    {
        var globalNotificationIds = await _context.Notifications
            .AsNoTracking()
            .Where(n =>
                n.IsGlobal &&
                !_context.UserNotifications.Any(un =>
                    un.NotificationId == n.Id &&
                    un.UserId == userId))
            .Select(n => n.Id)
            .ToListAsync();

        _context.UserNotifications.AddRange(
            globalNotificationIds.Select(notificationId => new UserNotification
            {
                UserId = userId,
                NotificationId = notificationId,
                IsRead = false
            }));

        if (globalNotificationIds.Count != 0)
            await _context.SaveChangesAsync();

        return await _context.UserNotifications
            .AsNoTracking()
            .Where(un => un.UserId == userId && un.CreatedAt != DismissedMarker)
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
            .AsNoTracking()
            .Where(un => un.UserId == userId && !un.IsRead)
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
            .FirstOrDefaultAsync(un =>
                un.NotificationId == notificationId &&
                un.UserId == userId);

        if (userNotification != null)
        {
            userNotification.IsRead = true;
            await _context.SaveChangesAsync();
            return;
        }

        var isGlobalNotification = await _context.Notifications
            .AnyAsync(notification => notification.Id == notificationId && notification.IsGlobal);

        if (!isGlobalNotification)
            return;

        _context.UserNotifications.Add(new UserNotification
        {
            NotificationId = notificationId,
            UserId = userId,
            IsRead = true
        });
        await _context.SaveChangesAsync();
    }

    public async Task RemoveForUserAsync(int notificationId, int userId)
    {
        var userNotification = await _context.UserNotifications
            .FirstOrDefaultAsync(un =>
                un.NotificationId == notificationId &&
                un.UserId == userId);

        // O vínculo permanece como marcador para que uma notificação global
        // removida pelo usuário não seja recriada no próximo carregamento.
        if (userNotification is null)
        {
            var isGlobalNotification = await _context.Notifications
                .AnyAsync(notification => notification.Id == notificationId && notification.IsGlobal);

            if (!isGlobalNotification)
                return;

            _context.UserNotifications.Add(new UserNotification
            {
                NotificationId = notificationId,
                UserId = userId,
                IsRead = true,
                CreatedAt = DismissedMarker
            });
        }
        else
        {
            userNotification.IsRead = true;
            userNotification.CreatedAt = DismissedMarker;
        }

        await _context.SaveChangesAsync();
    }

    public async Task MarkAllAsReadAsync(int userId)
    {
        var missingGlobalNotificationIds = await _context.Notifications
            .Where(notification =>
                notification.IsGlobal &&
                !_context.UserNotifications.Any(userNotification =>
                    userNotification.NotificationId == notification.Id &&
                    userNotification.UserId == userId))
            .Select(notification => notification.Id)
            .ToListAsync();

        _context.UserNotifications.AddRange(
            missingGlobalNotificationIds.Select(notificationId => new UserNotification
            {
                NotificationId = notificationId,
                UserId = userId,
                IsRead = true
            }));

        if (missingGlobalNotificationIds.Count != 0)
            await _context.SaveChangesAsync();

        await _context.UserNotifications
            .Where(un => un.UserId == userId && !un.IsRead)
            .ExecuteUpdateAsync(setters => setters.SetProperty(un => un.IsRead, true));
    }
}
