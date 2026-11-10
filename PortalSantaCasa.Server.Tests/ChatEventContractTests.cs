using MassTransit;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Services;
using PortalSantaCasa.Shared.Events.Chat;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class ChatEventContractTests
{
    [Fact]
    public async Task GroupCreationFiltersInactiveAndDuplicateMembersAndAssignsCreatorAsAdmin()
    {
        using var db = TestSupport.Database();
        var inactive = TestSupport.User(3); inactive.IsActive = false;
        db.Users.AddRange(TestSupport.User(1), TestSupport.User(2), inactive); await db.SaveChangesAsync();
        var events = new PublishedEvents(); var service = new ChatService(db, events.Endpoint);
        Assert.Null(await service.CreateGroupChatAsync(3, "forbidden", [1, 2]));
        Assert.Empty(events.Messages);
        var chat = (await service.CreateGroupChatAsync(1, "team", [1, 2, 2, 3, 99]))!;
        Assert.Equal(new[] { 1, 2 }, chat.Members.Select(user => user.Id).Order());
        var published = Assert.IsType<ChatCreatedEvent>(Assert.Single(events.Messages));
        Assert.Equal(new[] { 1, 2 }, published.UserIds.Order());
        Assert.Equal(chat.Id, published.Chat.Id);
        Assert.True((await db.ChatParticipants.SingleAsync(participant => participant.UserId == 1)).IsAdmin);
        Assert.False((await db.ChatParticipants.SingleAsync(participant => participant.UserId == 2)).IsAdmin);
    }

    [Fact]
    public async Task OnlyAdminCanAddMembersAndNewMemberReceivesInvitationOnce()
    {
        using var db = TestSupport.Database();
        var inactive = TestSupport.User(4); inactive.IsActive = false;
        db.Users.AddRange(TestSupport.User(1), TestSupport.User(2), TestSupport.User(3), inactive); await db.SaveChangesAsync();
        var events = new PublishedEvents(); var service = new ChatService(db, events.Endpoint);
        var chat = (await service.CreateGroupChatAsync(1, "team", [2]))!; events.Messages.Clear();
        Assert.Null(await service.AddMembersToGroupAsync(chat.Id, [3], 2));
        Assert.Empty(events.Messages); Assert.Equal(2, await db.ChatParticipants.CountAsync());
        await service.AddMembersToGroupAsync(chat.Id, [2, 3, 3, 4, 99], 1);
        Assert.Equal(new[] { 1, 2, 3 }, await db.ChatParticipants.OrderBy(participant => participant.UserId).Select(participant => participant.UserId).ToArrayAsync());
        var invitation = Assert.Single(events.Messages.OfType<ChatCreatedEvent>());
        Assert.Equal(new[] { 3 }, invitation.UserIds);
        var message = Assert.Single(events.Messages.OfType<ChatMessageCreatedEvent>());
        Assert.Equal(new[] { 1, 2, 3 }, message.UserIds.Order());
        Assert.Equal(1, message.Message.MessageType);
        Assert.Equal(3, message.Message.TargetUserId);
        Assert.Equal(new[] { 1, 2, 3 }, Assert.Single(events.Messages.OfType<ChatUpdatedEvent>()).UserIds.Order());
        events.Messages.Clear();
        await service.AddMembersToGroupAsync(chat.Id, [3], 1);
        Assert.Empty(events.Messages.OfType<ChatCreatedEvent>());
        Assert.Single(await db.ChatMessages.ToListAsync());
    }

    [Fact]
    public async Task RemovedGroupMemberReceivesRemovalButNoSubsequentGroupMessage()
    {
        using var db = TestSupport.Database();
        db.Users.AddRange(TestSupport.User(1), TestSupport.User(2), TestSupport.User(3)); await db.SaveChangesAsync();
        var events = new PublishedEvents(); var service = new ChatService(db, events.Endpoint);
        var chat = (await service.CreateGroupChatAsync(1, "team", [2, 3]))!; events.Messages.Clear();
        Assert.Null(await service.RemoveMemberFromGroupAsync(chat.Id, 3, 2)); Assert.Empty(events.Messages);
        await service.RemoveMemberFromGroupAsync(chat.Id, 3, 1);
        var removal = Assert.Single(events.Messages.OfType<ChatRemovedEvent>());
        Assert.Equal(3, removal.UserId); Assert.Equal(chat.Id, removal.ChatId);
        Assert.Equal(new[] { 1, 2 }, Assert.Single(events.Messages.OfType<ChatMessageCreatedEvent>()).UserIds.Order());
        Assert.Equal(new[] { 1, 2 }, Assert.Single(events.Messages.OfType<ChatUpdatedEvent>()).UserIds.Order());
        events.Messages.Clear();
        Assert.Null(await service.SendMessageAsync(chat.Id, 3, "forbidden", null));
        Assert.Null(await service.GetChatByIdAsync(chat.Id, 3));
        Assert.Empty(events.Messages);
        Assert.NotNull(await service.RemoveMemberFromGroupAsync(chat.Id, 2, 2));
        Assert.DoesNotContain(await db.ChatParticipants.ToListAsync(), participant => participant.UserId == 2);
    }

    [Fact]
    public async Task DepartmentChatReusesReversePairAndDeliversOnlyToActiveCurrentDepartments()
    {
        using var db = TestSupport.Database();
        var rh = TestSupport.User(2); rh.Department = "RH";
        var unrelated = TestSupport.User(3); unrelated.Department = "Financeiro";
        var inactive = TestSupport.User(4); inactive.Department = "RH"; inactive.IsActive = false;
        db.Users.AddRange(TestSupport.User(1), rh, unrelated, inactive); await db.SaveChangesAsync();
        var events = new PublishedEvents(); var service = new ChatService(db, events.Endpoint);
        Assert.Null(await service.StartDepartmentChatAsync(1, " ti "));
        Assert.Null(await service.StartDepartmentChatAsync(1, "missing"));
        Assert.Empty(events.Messages);
        var chat = (await service.StartDepartmentChatAsync(1, " rh "))!;
        Assert.True(chat.IsDepartmentChat);
        Assert.Equal(new[] { 1, 2 }, Assert.Single(events.Messages.OfType<ChatCreatedEvent>()).UserIds.Order());
        Assert.Equal(chat.Id, (await service.StartDepartmentChatAsync(2, "TI"))!.Id);
        Assert.Single(await db.Chats.ToListAsync());
        var newRh = TestSupport.User(5); newRh.Department = "RH";
        db.Users.Add(newRh); await db.SaveChangesAsync();
        Assert.Single(await service.GetUserChatsAsync(5));
        events.Messages.Clear();
        Assert.Null(await service.SendMessageAsync(chat.Id, 3, "forbidden", null));
        Assert.Empty(events.Messages);
        await service.SendMessageAsync(chat.Id, 1, "department only", null);
        Assert.Equal(new[] { 1, 2, 5 }, Assert.Single(events.Messages.OfType<ChatMessageCreatedEvent>()).UserIds.Order());
        Assert.Equal(new[] { 2, 5 }, events.Messages.OfType<UnreadCountUpdatedEvent>().Select(message => message.UserId).Order());
        events.Messages.Clear();
        rh.Department = "Financeiro"; await db.SaveChangesAsync();
        Assert.Null(await service.SendMessageAsync(chat.Id, 2, "former department", null));
        Assert.Empty(events.Messages);
    }

    [Fact]
    public async Task ReadUnreadAndDeleteArePrivateAndCannotBeAppliedByAnOutsider()
    {
        using var db = TestSupport.Database();
        db.Users.AddRange(TestSupport.User(1), TestSupport.User(2), TestSupport.User(3)); await db.SaveChangesAsync();
        var events = new PublishedEvents(); var service = new ChatService(db, events.Endpoint);
        var chat = (await service.StartNewChatAsync(1, 2))!;
        await service.SendMessageAsync(chat.Id, 1, "hello", null); events.Messages.Clear();
        Assert.False(await service.MarkChatAsReadAsync(chat.Id, 3));
        Assert.False(await service.MarkChatAsUnreadAsync(chat.Id, 3));
        Assert.False(await service.DeleteChatAsync(chat.Id, 3));
        Assert.Empty(events.Messages);
        Assert.Equal(1, await service.GetTotalUnreadChatsCountAsync(2));
        Assert.True(await service.MarkChatAsReadAsync(chat.Id, 2));
        Assert.Equal(0, await service.GetTotalUnreadChatsCountAsync(2));
        var read = Assert.Single(events.Messages.OfType<ChatReadEvent>());
        Assert.Equal(2, read.UserId); Assert.Equal(new[] { 1, 2 }, read.UserIds.Order());
        Assert.Equal(0, Assert.Single(events.Messages.OfType<UnreadCountUpdatedEvent>()).UnreadCount);
        events.Messages.Clear();
        Assert.True(await service.MarkChatAsUnreadAsync(chat.Id, 2));
        Assert.Equal(1, Assert.Single(events.Messages.OfType<UnreadCountUpdatedEvent>()).UnreadCount);
        events.Messages.Clear();
        Assert.True(await service.DeleteChatAsync(chat.Id, 2));
        Assert.Equal(2, Assert.IsType<ChatRemovedEvent>(Assert.Single(events.Messages)).UserId);
        Assert.Null(await service.GetChatByIdAsync(chat.Id, 2));
        Assert.NotNull(await service.GetChatByIdAsync(chat.Id, 1));
        Assert.Equal(0, await service.GetTotalUnreadChatsCountAsync(2));
        events.Messages.Clear();
        await service.SendMessageAsync(chat.Id, 1, "after removal", null);
        Assert.Equal(new[] { 1 }, Assert.Single(events.Messages.OfType<ChatMessageCreatedEvent>()).UserIds);
        Assert.Empty(events.Messages.OfType<UnreadCountUpdatedEvent>());
        await service.StartNewChatAsync(1, 2);
        Assert.NotNull(await service.GetChatByIdAsync(chat.Id, 2));
        Assert.Single(await db.Chats.ToListAsync());
    }

    [Theory]
    [InlineData("expired")]
    [InlineData("system")]
    [InlineData("deleted")]
    public async Task IneligibleMessageCannotBeEditedOrDeletedAndPublishesNothing(string reason)
    {
        using var db = TestSupport.Database();
        db.Users.AddRange(TestSupport.User(1), TestSupport.User(2)); await db.SaveChangesAsync();
        var events = new PublishedEvents(); var service = new ChatService(db, events.Endpoint);
        var chat = (await service.StartNewChatAsync(1, 2))!;
        var sent = (await service.SendMessageAsync(chat.Id, 1, "original", null))!;
        var message = await db.ChatMessages.SingleAsync();
        if (reason == "expired") message.SentAt = DateTimeOffset.UtcNow.AddMinutes(-16);
        if (reason == "system") message.MessageType = 1;
        if (reason == "deleted") message.IsDeleted = true;
        await db.SaveChangesAsync(); events.Messages.Clear();
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.EditMessageAsync(chat.Id, sent.Id, 1, "changed"));
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.DeleteMessageAsync(chat.Id, sent.Id, 1));
        Assert.Equal("original", (await db.ChatMessages.SingleAsync()).Content);
        Assert.Empty(events.Messages);
    }

    private sealed class PublishedEvents
    {
        public List<object> Messages { get; } = [];
        public IPublishEndpoint Endpoint { get; }
        public PublishedEvents() => Endpoint = RealtimeProxy.Create<IPublishEndpoint>((method, args) =>
        {
            if (method.Name != "Publish") throw new NotSupportedException(method.Name);
            Messages.Add(args![0]!);
            return Task.CompletedTask;
        });
    }
}
