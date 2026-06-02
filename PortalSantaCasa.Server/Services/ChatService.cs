using MassTransit;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Shared.DTOs.Chat;
using PortalSantaCasa.Shared.Events.Chat;

namespace PortalSantaCasa.Server.Services;

public class ChatService : IChatService
{
    private readonly PortalSantaCasaDbContext _context;
    private readonly IPublishEndpoint _publishEndpoint;

    public ChatService(
        PortalSantaCasaDbContext context,
        IPublishEndpoint publishEndpoint)
    {
        _context = context;
        _publishEndpoint = publishEndpoint;
    }

    public async Task<ChatDto?> StartNewChatAsync(int userId1, int userId2)
    {
        var existingChat = await _context.Chats
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c =>
                !c.IsGroup &&
                c.Participants.Any(p => p.UserId == userId1) &&
                c.Participants.Any(p => p.UserId == userId2));

        if (existingChat != null)
        {
            var participant1 = existingChat.Participants.FirstOrDefault(p => p.UserId == userId1);
            var participant2 = existingChat.Participants.FirstOrDefault(p => p.UserId == userId2);

            var changed = false;

            if (participant1 != null && participant1.IsDeleted)
            {
                participant1.IsDeleted = false;
                changed = true;
            }

            if (participant2 != null && participant2.IsDeleted)
            {
                participant2.IsDeleted = false;
                changed = true;
            }

            if (changed)
                await _context.SaveChangesAsync();

            var existingChatDto = await MapChatToDto(existingChat, userId1);

            await _publishEndpoint.Publish(new ChatCreatedEvent
            {
                UserIds = new[] { userId1, userId2 },
                Chat = existingChatDto
            });

            return existingChatDto;
        }

        var chat = new Chat
        {
            Name = $"Chat entre Usuário {userId1} e {userId2}",
            IsGroup = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            Participants =
            {
                new ChatParticipant { UserId = userId1 },
                new ChatParticipant { UserId = userId2 }
            }
        };

        _context.Chats.Add(chat);
        await _context.SaveChangesAsync();

        var chatDto = await MapChatToDto(chat, userId1);

        await _publishEndpoint.Publish(new ChatCreatedEvent
        {
            UserIds = new[] { userId1, userId2 },
            Chat = chatDto
        });

        return chatDto;
    }

    public async Task<ChatDto?> CreateGroupChatAsync(int creatorId, string groupName, IEnumerable<int> memberIds)
    {
        var ids = memberIds
            .Append(creatorId)
            .Distinct()
            .ToList();

        var chat = new Chat
        {
            Name = groupName,
            IsGroup = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            Participants = ids.Select(id => new ChatParticipant
            {
                UserId = id,
                IsAdmin = id == creatorId
            }).ToList()
        };

        _context.Chats.Add(chat);
        await _context.SaveChangesAsync();

        var chatDto = await MapChatToDto(chat, creatorId);

        await _publishEndpoint.Publish(new ChatCreatedEvent
        {
            UserIds = ids,
            Chat = chatDto
        });

        return chatDto;
    }

    public async Task<ChatDto?> AddMembersToGroupAsync(int chatId, IEnumerable<int> memberIds, int addedByUserId)
    {
        var chat = await _context.Chats
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == chatId && c.IsGroup);

        if (chat == null)
            return null;

        var addedByUser = await _context.Users.FindAsync(addedByUserId);

        if (addedByUser == null)
            return null;

        var existingIds = chat.Participants.Select(p => p.UserId).ToHashSet();
        var newlyAdded = new List<int>();

        foreach (var id in memberIds.Distinct())
        {
            if (!existingIds.Contains(id))
            {
                chat.Participants.Add(new ChatParticipant { UserId = id });
                newlyAdded.Add(id);
            }
        }

        chat.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        var chatDto = await MapChatToDto(chat, addedByUserId);

        foreach (var newMemberId in newlyAdded)
        {
            var addedUser = await _context.Users.FindAsync(newMemberId);

            if (addedUser == null)
                continue;

            var systemMessage = new ChatMessage
            {
                ChatId = chatId,
                SenderId = addedByUserId,
                MessageType = 1,
                SystemEventType = 1,
                TargetUserId = newMemberId,
                AddedByUserId = addedByUserId,
                Content = $"{addedByUser.Username} adicionou {addedUser.Username} ao grupo.",
                SentAt = DateTimeOffset.UtcNow
            };

            _context.ChatMessages.Add(systemMessage);
            await _context.SaveChangesAsync();

            var systemMessageDto = new ChatMessageDto
            {
                Id = systemMessage.Id,
                ChatId = chatId,
                SenderId = addedByUserId,
                SenderName = addedByUser.Username,
                SenderAvatarUrl = addedByUser.PhotoUrl,
                MessageType = systemMessage.MessageType,
                SystemEventType = systemMessage.SystemEventType,
                TargetUserId = newMemberId,
                TargetUserName = addedUser.Username,
                AddedByUserId = addedByUserId,
                AddedByUserName = addedByUser.Username,
                Content = systemMessage.Content,
                SentAt = systemMessage.SentAt,
                IsSent = false
            };

            await _publishEndpoint.Publish(new ChatMessageCreatedEvent
            {
                ChatId = chatId,
                Message = systemMessageDto
            });

            await _publishEndpoint.Publish(new ChatCreatedEvent
            {
                UserIds = new[] { newMemberId },
                Chat = chatDto
            });
        }

        await _publishEndpoint.Publish(new ChatUpdatedEvent
        {
            ChatId = chatId,
            Chat = chatDto
        });

        return chatDto;
    }

    public async Task<ChatDto?> RemoveMemberFromGroupAsync(int chatId, int memberId, int removedByUserId)
    {
        var chat = await _context.Chats
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == chatId && c.IsGroup);

        if (chat == null)
            return null;

        var removedByUser = await _context.Users.FindAsync(removedByUserId);
        var memberToRemove = await _context.Users.FindAsync(memberId);

        if (removedByUser == null || memberToRemove == null)
            return null;

        var participantToRemove = chat.Participants.FirstOrDefault(p => p.UserId == memberId);

        if (participantToRemove == null)
            return await MapChatToDto(chat, removedByUserId);

        chat.Participants.Remove(participantToRemove);

        var systemMessage = new ChatMessage
        {
            ChatId = chatId,
            SenderId = removedByUserId,
            MessageType = 1,
            SystemEventType = 0,
            TargetUserId = memberId,
            RemovedByUserId = removedByUserId,
            Content = $"{removedByUser.Username} removeu {memberToRemove.Username} do grupo.",
            SentAt = DateTimeOffset.UtcNow
        };

        _context.ChatMessages.Add(systemMessage);

        chat.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        var chatDto = await MapChatToDto(chat, removedByUserId);

        await _publishEndpoint.Publish(new ChatRemovedEvent
        {
            UserId = memberId,
            ChatId = chatId
        });

        var systemMessageDto = new ChatMessageDto
        {
            Id = systemMessage.Id,
            ChatId = systemMessage.ChatId,
            SenderId = systemMessage.SenderId,
            SenderName = removedByUser.Username,
            SenderAvatarUrl = removedByUser.PhotoUrl,
            MessageType = systemMessage.MessageType,
            SystemEventType = systemMessage.SystemEventType,
            TargetUserId = systemMessage.TargetUserId,
            TargetUserName = memberToRemove.Username,
            RemovedByUserId = systemMessage.RemovedByUserId,
            RemovedByUserName = removedByUser.Username,
            Content = systemMessage.Content,
            SentAt = systemMessage.SentAt,
            IsSent = false
        };

        await _publishEndpoint.Publish(new ChatMessageCreatedEvent
        {
            ChatId = chatId,
            Message = systemMessageDto
        });

        await _publishEndpoint.Publish(new ChatUpdatedEvent
        {
            ChatId = chatId,
            Chat = chatDto
        });

        return chatDto;
    }

    public async Task<IEnumerable<ChatDto>> GetUserChatsAsync(int userId)
    {
        var chats = await _context.Chats
            .Include(c => c.Participants).ThenInclude(p => p.User)
            .Include(c => c.Messages)
            .Where(c => c.Participants.Any(p => p.UserId == userId && !p.IsDeleted))
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync();

        return chats.Select(c => MapChatToDtoSync(c, userId));
    }

    public async Task<ChatDto?> GetChatByIdAsync(int chatId, int userId)
    {
        var chat = await _context.Chats
            .Include(c => c.Participants).ThenInclude(p => p.User)
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c =>
                c.Id == chatId &&
                c.Participants.Any(p => p.UserId == userId));

        return chat == null ? null : await MapChatToDto(chat, userId);
    }

    public async Task<IEnumerable<ChatMessageDto>> GetChatMessagesAsync(int chatId, int userId, int skip, int take)
    {
        var messages = await _context.ChatMessages
            .Include(m => m.Sender)
            .Include(m => m.File)
            .Where(m => m.ChatId == chatId)
            .OrderBy(m => m.SentAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var userIds = messages
            .Select(m => m.TargetUserId)
            .Union(messages.Select(m => m.RemovedByUserId))
            .Union(messages.Select(m => m.AddedByUserId))
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Username);

        return messages.Select(m => new ChatMessageDto
        {
            Id = m.Id,
            ChatId = m.ChatId,
            SenderId = m.SenderId,
            MessageType = m.MessageType,
            SystemEventType = m.SystemEventType,
            TargetUserId = m.TargetUserId,
            TargetUserName = m.TargetUserId.HasValue && users.ContainsKey(m.TargetUserId.Value) ? users[m.TargetUserId.Value] : null,
            RemovedByUserId = m.RemovedByUserId,
            RemovedByUserName = m.RemovedByUserId.HasValue && users.ContainsKey(m.RemovedByUserId.Value) ? users[m.RemovedByUserId.Value] : null,
            AddedByUserId = m.AddedByUserId,
            AddedByUserName = m.AddedByUserId.HasValue && users.ContainsKey(m.AddedByUserId.Value) ? users[m.AddedByUserId.Value] : null,
            SenderName = m.Sender.Username,
            SenderAvatarUrl = m.Sender.PhotoUrl,
            Content = m.Content,
            SentAt = m.SentAt,
            IsSent = m.SenderId == userId,
            File = m.File == null
                ? null
                : new ChatFileDto
                {
                    Url = m.File.FilePath,
                    ContentType = m.File.ContentType,
                    FileName = m.File.FileName,
                    Size = m.File.FileSize
                }
        }).ToList();
    }

    public async Task<bool> MarkChatAsReadAsync(int chatId, int userId)
    {
        var participant = await _context.ChatParticipants
            .FirstOrDefaultAsync(p => p.ChatId == chatId && p.UserId == userId);

        if (participant == null)
            return false;

        participant.LastReadMessageAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync();

        await _publishEndpoint.Publish(new ChatReadEvent
        {
            ChatId = chatId,
            UserId = userId
        });

        var totalUnread = await GetTotalUnreadChatsCountAsync(userId);

        await _publishEndpoint.Publish(new UnreadCountUpdatedEvent
        {
            UserId = userId,
            UnreadCount = totalUnread
        });

        return true;
    }

    public async Task<bool> DeleteChatAsync(int chatId, int userId)
    {
        var participant = await _context.ChatParticipants
            .FirstOrDefaultAsync(p => p.ChatId == chatId && p.UserId == userId);

        if (participant == null)
            return false;

        participant.IsDeleted = true;
        await _context.SaveChangesAsync();

        await _publishEndpoint.Publish(new ChatRemovedEvent
        {
            UserId = userId,
            ChatId = chatId
        });

        return true;
    }

    public async Task<bool> MarkChatAsUnreadAsync(int chatId, int userId)
    {
        var participant = await _context.ChatParticipants
            .FirstOrDefaultAsync(p => p.ChatId == chatId && p.UserId == userId);

        if (participant == null)
            return false;

        participant.LastReadMessageAt = DateTime.MinValue;
        await _context.SaveChangesAsync();

        var totalUnread = await GetTotalUnreadChatsCountAsync(userId);

        await _publishEndpoint.Publish(new UnreadCountUpdatedEvent
        {
            UserId = userId,
            UnreadCount = totalUnread
        });

        return true;
    }

    public async Task<int> GetTotalUnreadChatsCountAsync(int userId)
    {
        var chats = await _context.Chats
            .Include(c => c.Participants)
            .Include(c => c.Messages)
            .Where(c => c.Participants.Any(p => p.UserId == userId && !p.IsDeleted))
            .ToListAsync();

        var totalUnreadChats = 0;

        foreach (var chat in chats)
        {
            var participant = chat.Participants.FirstOrDefault(p => p.UserId == userId);
            var lastReadTime = participant?.LastReadMessageAt ?? DateTime.MinValue;

            var unreadMessagesCount = chat.Messages
                .Count(m => m.SentAt > lastReadTime && m.SenderId != userId);

            if (unreadMessagesCount > 0)
                totalUnreadChats++;
        }

        return totalUnreadChats;
    }

    public async Task<ChatDto?> UpdateGroupAvatarAsync(int chatId, IFormFile avatar)
    {
        var chat = await _context.Chats
            .FirstOrDefaultAsync(c => c.Id == chatId && c.IsGroup);

        if (chat == null)
            return null;

        if (!string.IsNullOrEmpty(chat.AvatarUrl) &&
            avatar != null &&
            File.Exists(chat.AvatarUrl) &&
            chat.AvatarUrl != "Uploads/Grupos/default-group.png")
        {
            File.Delete(chat.AvatarUrl);
        }

        chat.AvatarUrl = await ProcessarMidiasAsync(avatar);
        chat.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        var chatDto = await MapChatToDto(chat);

        await _publishEndpoint.Publish(new ChatUpdatedEvent
        {
            ChatId = chatId,
            Chat = chatDto
        });

        return chatDto;
    }

    public async Task<ChatMessageDto?> SendMessageAsync(
        int chatId,
        int senderId,
        string? content,
        IEnumerable<IFormFile>? files)
    {
        var chat = await _context.Chats
            .Include(c => c.Participants)
            .FirstOrDefaultAsync(c => c.Id == chatId);

        if (chat == null)
            return null;

        var message = new ChatMessage
        {
            ChatId = chatId,
            SenderId = senderId,
            Content = content,
            SentAt = DateTimeOffset.UtcNow
        };

        _context.ChatMessages.Add(message);
        chat.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync();

        var savedFiles = await ProcessarChatMidiasAsync(chatId, message.Id, files);
        var sender = await _context.Users.FindAsync(senderId);

        var dto = new ChatMessageDto
        {
            Id = message.Id,
            ChatId = chatId,
            SenderId = senderId,
            SenderName = sender?.Username ?? "Usuário",
            SenderAvatarUrl = sender?.PhotoUrl ?? string.Empty,
            Content = message.Content,
            SentAt = message.SentAt,
            IsSent = true,
            File = savedFiles.LastOrDefault() == null
                ? null
                : new ChatFileDto
                {
                    FileName = savedFiles.Last().FileName,
                    Url = savedFiles.Last().FilePath,
                    ContentType = savedFiles.Last().ContentType,
                    Size = savedFiles.Last().FileSize
                }
        };

        await _publishEndpoint.Publish(new ChatMessageCreatedEvent
        {
            ChatId = chatId,
            Message = dto
        });

        var others = chat.Participants
            .Where(p => p.UserId != senderId)
            .ToList();

        foreach (var participant in others)
        {
            var totalUnread = await GetTotalUnreadChatsCountAsync(participant.UserId);

            await _publishEndpoint.Publish(new UnreadCountUpdatedEvent
            {
                UserId = participant.UserId,
                UnreadCount = totalUnread
            });

            var chatDto = await MapChatToDto(chat, participant.UserId);

            await _publishEndpoint.Publish(new ChatUpdatedEvent
            {
                UserId = participant.UserId,
                Chat = chatDto
            });
        }

        return dto;
    }

    private async Task<ChatDto> MapChatToDto(Chat chat, int currentUserId = 0)
    {
        await _context.Entry(chat)
            .Collection(c => c.Participants)
            .Query()
            .Include(p => p.User)
            .LoadAsync();

        await _context.Entry(chat)
            .Collection(c => c.Messages)
            .LoadAsync();

        return MapChatToDtoSync(chat, currentUserId);
    }

    private ChatDto MapChatToDtoSync(Chat chat, int currentUserId = 0)
    {
        var participant = chat.Participants.FirstOrDefault(p => p.UserId == currentUserId);
        var lastReadTime = participant?.LastReadMessageAt ?? DateTime.MinValue;

        var unreadMessagesCount = chat.Messages
            .Count(m => m.SentAt > lastReadTime && m.SenderId != currentUserId);

        var lastMsg = chat.Messages
            .OrderByDescending(m => m.SentAt)
            .FirstOrDefault();

        var name = chat.Name;
        var avatarUrl = chat.AvatarUrl;

        if (!chat.IsGroup)
        {
            var participantUsers = chat.Participants
                .Where(p => !p.IsDeleted)
                .Select(p => p.User)
                .ToList();

            if (participantUsers.Count >= 1)
            {
                var otherUser = participantUsers.FirstOrDefault(u => u.Id != currentUserId) ?? participantUsers.First();

                name = otherUser.Username;
                avatarUrl = string.IsNullOrEmpty(otherUser.PhotoUrl)
                    ? "Uploads/Usuarios/default-user.png"
                    : otherUser.PhotoUrl;
            }
        }
        else
        {
            if (string.IsNullOrEmpty(avatarUrl))
                avatarUrl = "Uploads/Grupos/default-group.png";
        }

        return new ChatDto
        {
            Id = chat.Id,
            Name = name,
            AvatarUrl = avatarUrl,
            IsGroup = chat.IsGroup,
            UnreadMessagesCount = unreadMessagesCount,
            LastMessage = lastMsg?.Content ?? string.Empty,
            LastMessageTime = lastMsg?.SentAt ?? chat.UpdatedAt,
            IsDeleted = participant?.IsDeleted ?? false,
            Members = chat.Participants.Select(p => new UserChatDto
            {
                Id = p.User.Id,
                Username = p.User.Username,
                PhotoUrl = p.User.PhotoUrl
            }).ToList()
        };
    }

    private static async Task<string?> ProcessarMidiasAsync(IFormFile midia)
    {
        var baseDirectory = Path.Combine("Uploads", "Grupos").Replace("\\", "/");

        if (!Directory.Exists(baseDirectory))
            Directory.CreateDirectory(baseDirectory);

        var filePath = Path.Combine(
            baseDirectory,
            Guid.NewGuid() + Path.GetExtension(midia.FileName))
            .Replace("\\", "/");

        await using var stream = new FileStream(filePath, FileMode.Create);
        await midia.CopyToAsync(stream);

        return filePath;
    }

    private async Task<List<ChatMessageFile>> ProcessarChatMidiasAsync(
        int chatId,
        int messageId,
        IEnumerable<IFormFile>? files)
    {
        var savedFiles = new List<ChatMessageFile>();

        if (files == null)
            return savedFiles;

        var baseDirectory = Path.Combine("Uploads", "Chats", chatId.ToString())
            .Replace("\\", "/");

        if (!Directory.Exists(baseDirectory))
            Directory.CreateDirectory(baseDirectory);

        foreach (var file in files)
        {
            var safeName = Path.GetFileName(file.FileName);
            var fileName = $"{messageId}-{Guid.NewGuid()}{Path.GetExtension(safeName)}";

            var filePath = Path.Combine(baseDirectory, fileName)
                .Replace("\\", "/");

            await using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);

            var fileEntity = new ChatMessageFile
            {
                MessageId = messageId,
                FileName = safeName,
                FilePath = filePath,
                ContentType = file.ContentType,
                FileSize = file.Length
            };

            savedFiles.Add(fileEntity);
        }

        if (savedFiles.Any())
        {
            _context.ChatMessageFiles.AddRange(savedFiles);
            await _context.SaveChangesAsync();
        }

        return savedFiles;
    }
}