using PortalSantaCasa.Shared.DTOs.Chat;

namespace PortalSantaCasa.Server.Interfaces;

public interface IChatService
{
    Task<IEnumerable<ChatDto>> GetUserChatsAsync(int userId);
    Task<ChatDto?> GetChatByIdAsync(int chatId, int userId);
    Task<ChatDto?> StartNewChatAsync(int userId1, int userId2);
    Task<ChatDto?> CreateGroupChatAsync(int creatorId, string groupName, IEnumerable<int> memberIds);
    Task<ChatDto?> AddMembersToGroupAsync(int chatId, IEnumerable<int> memberIds, int addedByUserId);
    Task<ChatDto?> RemoveMemberFromGroupAsync(int chatId, int memberId, int removedByUserId);
    Task<bool> DeleteChatAsync(int chatId, int userId);
    Task<bool> MarkChatAsReadAsync(int chatId, int userId);
    Task<bool> MarkChatAsUnreadAsync(int chatId, int userId);
    Task<IEnumerable<ChatMessageDto>> GetChatMessagesAsync(int chatId, int userId, int skip, int take);
    Task<int> GetTotalUnreadChatsCountAsync(int userId);
    Task<ChatDto?> UpdateGroupAvatarAsync(int chatId, int userId, IFormFile avatar);
    Task<ChatMessageDto?> SendMessageAsync(int chatId, int senderId, string? content, string senderDisplayName, string senderRe, IEnumerable<IFormFile>? files);
}
