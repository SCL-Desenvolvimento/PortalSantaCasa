using MassTransit;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging.Abstractions;
using PortalSantaCasa.Realtime.Consumers;
using PortalSantaCasa.Realtime.Hubs;
using PortalSantaCasa.Shared.DTOs.Chat;
using PortalSantaCasa.Shared.DTOs.Notifications;
using PortalSantaCasa.Shared.Events.Chat;
using PortalSantaCasa.Shared.Events.Notifications;
using System.Reflection;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class RealtimeConsumerTests
{
    [Fact]
    public async Task NewChatGoesOnlyToEachNamedParticipant()
    {
        var hub = new RecordingHub<ChatHub>();
        var chat = new ChatDto { Id = 7 };
        await new ChatCreatedConsumer(hub.Context).Consume(Message(new ChatCreatedEvent { UserIds = [12, 34], Chat = chat }));
        Assert.Collection(hub.Deliveries,
            delivery => AssertDelivery(delivery, "User:12", "NewChat", chat),
            delivery => AssertDelivery(delivery, "User:34", "NewChat", chat));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task MessageCreationTargetsExplicitRecipientsAndSkipsEmptyList(bool hasRecipients)
    {
        var hub = new RecordingHub<ChatHub>();
        var message = new ChatMessageDto { Id = 8, ChatId = 7, Content = "private" };
        await new ChatMessageConsumer(hub.Context, NullLogger<ChatMessageConsumer>.Instance)
            .Consume(Message(new ChatMessageCreatedEvent { ChatId = 7, UserIds = hasRecipients ? [12, 34] : [], Message = message }));
        if (hasRecipients) AssertDelivery(Assert.Single(hub.Deliveries), "Users:12,34", "ReceiveMessage", message);
        else Assert.Empty(hub.Selections);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task MessageEditTargetsExplicitRecipientsAndSkipsEmptyList(bool hasRecipients)
    {
        var hub = new RecordingHub<ChatHub>();
        var message = new ChatMessageDto { Id = 8, ChatId = 7, Content = "edited" };
        await new ChatMessageUpdatedConsumer(hub.Context)
            .Consume(Message(new ChatMessageUpdatedEvent { ChatId = 7, UserIds = hasRecipients ? [12, 34] : [], Message = message }));
        if (hasRecipients) AssertDelivery(Assert.Single(hub.Deliveries), "Users:12,34", "MessageUpdated", message);
        else Assert.Empty(hub.Selections);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ReactionsCarryChatMessageAndReactionDataOnlyToRecipients(bool hasRecipients)
    {
        var hub = new RecordingHub<ChatHub>();
        var reactions = new[] { new ChatMessageReactionDto { UserId = 12, Emoji = "👍" } };
        await new ChatMessageReactionsUpdatedConsumer(hub.Context).Consume(Message(new ChatMessageReactionsUpdatedEvent
        {
            ChatId = 7, MessageId = 8, UserIds = hasRecipients ? [12, 34] : [], Reactions = reactions
        }));
        if (!hasRecipients) { Assert.Empty(hub.Selections); return; }
        var delivery = Assert.Single(hub.Deliveries);
        Assert.Equal("Users:12,34", delivery.Target);
        Assert.Equal("MessageReactionsUpdated", delivery.Method);
        var payload = Assert.Single(delivery.Arguments)!;
        Assert.Equal(7, payload.GetType().GetProperty("ChatId")!.GetValue(payload));
        Assert.Equal(8, payload.GetType().GetProperty("MessageId")!.GetValue(payload));
        Assert.Same(reactions, payload.GetType().GetProperty("Reactions")!.GetValue(payload));
    }

    [Theory]
    [InlineData(true, "Users:12,34")]
    [InlineData(false, "Group:7")]
    public async Task ReadReceiptPrefersRecipientsAndFallsBackToLegacyGroup(bool hasRecipients, string target)
    {
        var hub = new RecordingHub<ChatHub>();
        await new ChatReadConsumer(hub.Context).Consume(Message(new ChatReadEvent { ChatId = 7, UserId = 12, UserIds = hasRecipients ? [12, 34] : [] }));
        AssertDelivery(Assert.Single(hub.Deliveries), target, "ChatRead", 12);
    }

    [Theory]
    [InlineData(true, 12, 7, "Users:12,34")]
    [InlineData(false, 12, 7, "User:12")]
    [InlineData(false, null, 7, "Group:7")]
    [InlineData(false, null, null, null)]
    public async Task ChatUpdateUsesMostSpecificAvailableTarget(bool hasRecipients, int? userId, int? chatId, string? target)
    {
        var hub = new RecordingHub<ChatHub>();
        var chat = new ChatDto { Id = 7 };
        await new ChatUpdatedConsumer(hub.Context).Consume(Message(new ChatUpdatedEvent
        {
            UserIds = hasRecipients ? [12, 34] : [], UserId = userId, ChatId = chatId, Chat = chat
        }));
        if (target == null) Assert.Empty(hub.Selections);
        else AssertDelivery(Assert.Single(hub.Deliveries), target, "ChatUpdated", chat);
    }

    [Fact]
    public async Task RemovalAndUnreadCountArePrivateToAffectedUser()
    {
        var hub = new RecordingHub<ChatHub>();
        await new ChatRemovedConsumer(hub.Context).Consume(Message(new ChatRemovedEvent { ChatId = 7, UserId = 12 }));
        await new UnreadCountUpdatedConsumer(hub.Context).Consume(Message(new UnreadCountUpdatedEvent { UserId = 34, UnreadCount = 3 }));
        Assert.Collection(hub.Deliveries,
            delivery => AssertDelivery(delivery, "User:12", "ChatRemoved", 7),
            delivery => AssertDelivery(delivery, "User:34", "UnreadCountUpdate", 3));
    }

    [Theory]
    [InlineData(true, true, "All")]
    [InlineData(true, false, "All")]
    [InlineData(false, true, "Users:12,34")]
    [InlineData(false, false, null)]
    public async Task OnlyGlobalNotificationsBroadcast(bool isGlobal, bool hasRecipients, string? target)
    {
        var hub = new RecordingHub<NotificationHub>();
        var notification = new NotificationDto { Id = 8, Title = "private" };
        await new NotificationConsumer(hub.Context).Consume(Message(new NotificationCreatedEvent
        {
            IsGlobal = isGlobal, UserIds = hasRecipients ? [12, 34] : [], Notification = notification
        }));
        if (target == null) Assert.Empty(hub.Selections);
        else AssertDelivery(Assert.Single(hub.Deliveries), target, "ReceiveNotification", notification);
    }

    [Fact]
    public async Task DeletedNotificationIdsAreBroadcastWithoutChangingPayload()
    {
        var hub = new RecordingHub<NotificationHub>();
        var ids = new[] { 7, 8 };
        await new NotificationDeletedConsumer(hub.Context).Consume(Message(new NotificationDeletedEvent { NotificationIds = ids }));
        AssertDelivery(Assert.Single(hub.Deliveries), "All", "NotificationsDeleted", ids);
    }

    [Fact]
    public async Task FailedChatDeliveryPropagatesForMessageBusRetry()
    {
        var hub = new RecordingHub<ChatHub> { SendFailure = new IOException("SignalR unavailable") };
        var error = await Assert.ThrowsAsync<IOException>(() => new ChatMessageConsumer(hub.Context, NullLogger<ChatMessageConsumer>.Instance)
            .Consume(Message(new ChatMessageCreatedEvent { UserIds = [12], Message = new ChatMessageDto { Id = 8 } })));
        Assert.Same(hub.SendFailure, error);
    }

    [Fact]
    public async Task FailedNotificationDeliveryPropagatesForMessageBusRetry()
    {
        var hub = new RecordingHub<NotificationHub> { SendFailure = new IOException("SignalR unavailable") };
        var error = await Assert.ThrowsAsync<IOException>(() => new NotificationConsumer(hub.Context)
            .Consume(Message(new NotificationCreatedEvent { IsGlobal = true, Notification = new NotificationDto() })));
        Assert.Same(hub.SendFailure, error);
    }

    private static ConsumeContext<T> Message<T>(T message) where T : class =>
        RealtimeProxy.Create<ConsumeContext<T>>((method, _) => method.Name == "get_Message" ? message : throw new NotSupportedException(method.Name));

    private static void AssertDelivery(RealtimeDelivery delivery, string target, string method, object payload)
    {
        Assert.Equal(target, delivery.Target);
        Assert.Equal(method, delivery.Method);
        Assert.Equal(payload, Assert.Single(delivery.Arguments));
    }
}

internal sealed record RealtimeDelivery(string Target, string Method, object?[] Arguments);

internal sealed class RecordingHub<THub> where THub : Hub
{
    public List<RealtimeDelivery> Deliveries { get; } = [];
    public List<string> Selections { get; } = [];
    public Exception? SendFailure { get; set; }
    public IHubContext<THub> Context { get; }
    public IHubCallerClients CallerClients { get; }

    public RecordingHub()
    {
        var clients = RealtimeProxy.Create<IHubClients>(SelectClient);
        CallerClients = RealtimeProxy.Create<IHubCallerClients>(SelectClient);
        Context = RealtimeProxy.Create<IHubContext<THub>>((method, _) =>
            method.Name == "get_Clients" ? clients : throw new NotSupportedException(method.Name));
    }

    private object SelectClient(MethodInfo method, object?[]? args)
    {
        var target = method.Name switch
        {
            "get_All" => "All",
            "get_Caller" => "Caller",
            "User" => "User:" + args![0],
            "Group" => "Group:" + args![0],
            "Users" => "Users:" + string.Join(',', (IEnumerable<string>)args![0]!),
            _ => throw new NotSupportedException(method.Name)
        };
        Selections.Add(target);
        return RealtimeProxy.Create<ISingleClientProxy>((sendMethod, sendArgs) =>
        {
            if (sendMethod.Name != "SendCoreAsync") throw new NotSupportedException(sendMethod.Name);
            Deliveries.Add(new RealtimeDelivery(target, (string)sendArgs![0]!, (object?[])sendArgs[1]!));
            return SendFailure == null ? Task.CompletedTask : Task.FromException(SendFailure);
        });
    }
}

public class RealtimeProxy : DispatchProxy
{
    public Func<MethodInfo, object?[]?, object?> Handler { get; set; } = null!;
    public static T Create<T>(Func<MethodInfo, object?[]?, object?> handler) where T : class
    {
        var proxy = Create<T, RealtimeProxy>();
        ((RealtimeProxy)(object)proxy).Handler = handler;
        return proxy;
    }
    protected override object? Invoke(MethodInfo? method, object?[]? args) => Handler(method!, args);
}
