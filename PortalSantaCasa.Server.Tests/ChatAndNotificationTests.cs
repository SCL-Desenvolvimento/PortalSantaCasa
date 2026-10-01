using MassTransit;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Services;
using PortalSantaCasa.Server.Utils;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class ChatAndNotificationTests
{
    [Fact]
    public async Task ChatIsPrivateAndRestartsWithoutDuplicatingConversation()
    {
        using var db = TestSupport.Database();
        db.Users.AddRange(TestSupport.User(1), TestSupport.User(2), TestSupport.User(3)); await db.SaveChangesAsync();
        var service = new ChatService(db, TestSupport.Stub<IPublishEndpoint>());
        Assert.Null(await service.StartNewChatAsync(1, 1)); Assert.Null(await service.StartNewChatAsync(1, 99));
        var chat = (await service.StartNewChatAsync(1, 2))!;
        Assert.NotNull(chat); Assert.NotNull(await service.GetChatByIdAsync(chat.Id, 1));
        Assert.Null(await service.GetChatByIdAsync(chat.Id, 3));
        Assert.Null(await service.SendMessageAsync(chat.Id, 3, "forbidden", null));
        Assert.Empty(await service.GetChatMessagesAsync(chat.Id, 3, 0, 10));
        Assert.Equal(chat.Id, (await service.StartNewChatAsync(2, 1))!.Id);
        Assert.Single(await db.Chats.ToListAsync());
    }

    [Fact]
    public async Task MessagesCanOnlyBeEditedOrDeletedBySenderAndReactionsToggle()
    {
        using var db = TestSupport.Database(); db.Users.AddRange(TestSupport.User(1), TestSupport.User(2)); await db.SaveChangesAsync();
        var service = new ChatService(db, TestSupport.Stub<IPublishEndpoint>());
        var chat = (await service.StartNewChatAsync(1, 2))!;
        var message = (await service.SendMessageAsync(chat.Id, 1, "original", null))!;
        Assert.Null(await service.EditMessageAsync(chat.Id, message.Id, 2, "forbidden"));
        Assert.Null(await service.DeleteMessageAsync(chat.Id, message.Id, 2));
        Assert.NotNull(await service.EditMessageAsync(chat.Id, message.Id, 1, "edited"));
        Assert.Single((await service.ToggleMessageReactionAsync(chat.Id, message.Id, 2, "👍"))!);
        Assert.Empty((await service.ToggleMessageReactionAsync(chat.Id, message.Id, 2, "👍"))!);
        await Assert.ThrowsAsync<ArgumentException>(() => service.ToggleMessageReactionAsync(chat.Id, message.Id, 2, "invalid"));
        Assert.NotNull(await service.DeleteMessageAsync(chat.Id, message.Id, 1));
        Assert.Null(await service.ToggleMessageReactionAsync(chat.Id, message.Id, 2, "👍"));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(10001)]
    public async Task InvalidMessageDoesNotPersist(int length)
    {
        using var db = TestSupport.Database(); var service = new ChatService(db, TestSupport.Stub<IPublishEndpoint>());
        await Assert.ThrowsAsync<FileUploadValidationException>(() => service.SendMessageAsync(1, 1, new string('a', length), null));
        Assert.Empty(await db.ChatMessages.ToListAsync());
    }

    [Fact]
    public async Task DepartmentNotificationIsPrivateAndDismissalSurvivesReload()
    {
        using var db = TestSupport.Database();
        var user2 = TestSupport.User(2); user2.Department = "RH";
        db.Users.AddRange(TestSupport.User(1), user2); await db.SaveChangesAsync();
        var service = new NotificationService(db, TestSupport.Stub<IPublishEndpoint>());
        var notification = await service.CreateNotificationAsync(new NotificationCreateDto { Type = "test", Title = "test", Message = "test",
            Link = "/test", IsGlobal = false, TargetDepartment = "TI" });
        Assert.Single(await service.GetUserNotificationsAsync(1)); Assert.Empty(await service.GetUserNotificationsAsync(2));
        await service.MarkAsReadAsync(notification.Id, 2); Assert.Equal(1, await service.GetUnreadCountAsync(1));
        await service.MarkAsReadAsync(notification.Id, 1); Assert.Equal(0, await service.GetUnreadCountAsync(1));
        await service.RemoveForUserAsync(notification.Id, 1); Assert.Empty(await service.GetUserNotificationsAsync(1));
        Assert.Empty(await service.GetUserNotificationsAsync(1));
    }

    [Fact]
    public async Task GlobalNotificationDismissalDoesNotReappearAndDoesNotAffectAnotherUser()
    {
        using var db = TestSupport.Database(); db.Users.AddRange(TestSupport.User(1), TestSupport.User(2)); await db.SaveChangesAsync();
        var service = new NotificationService(db, TestSupport.Stub<IPublishEndpoint>());
        var notification = await service.CreateNotificationAsync(new NotificationCreateDto { Type = "news", Title = "test", Message = "test", Link = "/news/1" });
        Assert.Single(await service.GetUserNotificationsAsync(1));
        await service.RemoveForUserAsync(notification.Id, 1);
        Assert.Empty(await service.GetUserNotificationsAsync(1)); Assert.Single(await service.GetUserNotificationsAsync(2));
        await service.DeleteBySourceAsync("news", "/news/1");
        Assert.Empty(await db.Notifications.ToListAsync()); Assert.Empty(await db.UserNotifications.ToListAsync());
    }
}
