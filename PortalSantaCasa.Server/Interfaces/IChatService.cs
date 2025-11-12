using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IChatService
    {
        Task<IEnumerable<ChatDto>> GetUserChatsAsync(int userId);
        Task<ChatDto> GetChatByIdAsync(int chatId, int userId);
        Task<ChatDto> StartNewChatAsync(int userId1, int userId2);
        Task<ChatDto> CreateGroupChatAsync(int creatorId, string groupName, IEnumerable<int> memberIds);
        Task<ChatDto> AddMembersToGroupAsync(int chatId, IEnumerable<int> memberIds);
        Task<bool> DeleteChatAsync(int chatId, int userId);
        Task<bool> MarkChatAsReadAsync(int chatId, int userId);
        Task<bool> MarkChatAsUnreadAsync(int chatId, int userId);
        Task<ChatMessageDto> SendMessageAsync(int chatId, int senderId, string content);
        Task<IEnumerable<ChatMessageDto>> GetChatMessagesAsync(int chatId, int userId, int skip, int take);
        Task<ChatDto?> UpdateGroupAvatarAsync(int chatId, string avatarUrl);
    }
}
