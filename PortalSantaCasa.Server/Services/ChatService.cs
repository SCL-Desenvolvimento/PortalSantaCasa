
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Server.Hubs;

namespace PortalSantaCasa.Server.Services
{
    public class ChatService : IChatService
    {
        private readonly PortalSantaCasaDbContext _context;
        private readonly IHubContext<ChatHub> _hubContext;

        public ChatService(PortalSantaCasaDbContext context, IHubContext<ChatHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        // 🟢 Inicia um chat 1:1
        public async Task<ChatDto?> StartNewChatAsync(int userId1, int userId2)
        {
            var existingChat = await _context.Chats
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c =>
                    !c.IsGroup &&
                    c.Participants.Any(p => p.UserId == userId1) &&
                    c.Participants.Any(p => p.UserId == userId2));

            if (existingChat != null)
                return await MapChatToDto(existingChat);

            var chat = new Chat
            {
                Name = $"Chat entre Usuário {userId1} e {userId2}",
                IsGroup = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Participants =
                {
                    new ChatParticipant { UserId = userId1 },
                    new ChatParticipant { UserId = userId2 }
                }
            };

            _context.Chats.Add(chat);
            await _context.SaveChangesAsync();

            var chatDto = await MapChatToDto(chat);

            // Notificar os usuários envolvidos sobre o novo chat
            if (chatDto != null)
            {
                await _hubContext.Clients.User(userId1.ToString()).SendAsync("NewChat", chatDto);
                await _hubContext.Clients.User(userId2.ToString()).SendAsync("NewChat", chatDto);
            }

            return chatDto;
        }

        // 🟢 Cria um grupo
        public async Task<ChatDto?> CreateGroupChatAsync(int creatorId, string groupName, IEnumerable<int> memberIds)
        {
            var chat = new Chat
            {
                Name = groupName,
                IsGroup = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                Participants = memberIds
                    .Distinct()
                    .Select(id => new ChatParticipant
                    {
                        UserId = id,
                        IsAdmin = id == creatorId
                    }).ToList()
            };

            _context.Chats.Add(chat);
            await _context.SaveChangesAsync();

            var chatDto = await MapChatToDto(chat);

            // Notificar os membros do grupo sobre o novo chat
            if (chatDto != null)
            {
                foreach (var memberId in memberIds)
                {
                    await _hubContext.Clients.User(memberId.ToString()).SendAsync("NewChat", chatDto);
                }
            }

            return chatDto;
        }

        // 🟢 Adiciona membros a um grupo
        public async Task<ChatDto?> AddMembersToGroupAsync(int chatId, IEnumerable<int> memberIds)
        {
            var chat = await _context.Chats
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == chatId && c.IsGroup);

            if (chat == null) return null;

            var existingIds = chat.Participants.Select(p => p.UserId).ToHashSet();

            foreach (var id in memberIds)
            {
                if (!existingIds.Contains(id))
                    chat.Participants.Add(new ChatParticipant { UserId = id });
            }

            chat.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var chatDto = await MapChatToDto(chat);

            // Notificar os novos membros sobre o chat
            if (chatDto != null)
            {
                foreach (var memberId in memberIds)
                {
                    await _hubContext.Clients.User(memberId.ToString()).SendAsync("NewChat", chatDto);
                }
                // Notificar os membros existentes sobre a atualização do chat
                await _hubContext.Clients.Group(chatId.ToString()).SendAsync("ChatUpdated", chatDto);
            }

            return chatDto;
        }

        // 🟢 Envia uma mensagem
        public async Task<ChatMessageDto?> SendMessageAsync(int chatId, int senderId, string content)
        {
            var chat = await _context.Chats
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == chatId);

            if (chat == null) return null;

            var message = new ChatMessage
            {
                ChatId = chatId,
                SenderId = senderId,
                Content = content,
                SentAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(message);
            chat.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == senderId);

            var messageDto = new ChatMessageDto
            {
                Id = message.Id,
                ChatId = chatId,
                SenderId = senderId,
                SenderName = sender?.Username ?? "Usuário",
                SenderAvatarUrl = sender?.PhotoUrl ?? string.Empty,
                Content = content,
                SentAt = message.SentAt,
                IsSent = true
            };

            // 💡 Correção: Enviar a mensagem via SignalR para todos os clientes conectados ao chat
            await _hubContext.Clients.Group(chatId.ToString()).SendAsync("ReceiveMessage", messageDto);

            return messageDto;
        }

        // 🟢 Lista os chats de um usuário
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

        // 🟢 Busca um chat específico
        public async Task<ChatDto?> GetChatByIdAsync(int chatId, int userId)
        {
            var chat = await _context.Chats
                .Include(c => c.Participants).ThenInclude(p => p.User)
                .Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == chatId &&
                                          c.Participants.Any(p => p.UserId == userId));

            return chat == null ? null : await MapChatToDto(chat, userId);
        }

        // 🟢 Lista mensagens
        public async Task<IEnumerable<ChatMessageDto>> GetChatMessagesAsync(int chatId, int userId, int skip, int take)
        {
            return await _context.ChatMessages
                .Include(m => m.Sender)
                .Where(m => m.ChatId == chatId)
                .OrderBy(m => m.SentAt)
                .Skip(skip)
                .Take(take)
                .Select(m => new ChatMessageDto
                {
                    Id = m.Id,
                    ChatId = m.ChatId,
                    SenderId = m.SenderId,
                    SenderName = m.Sender.Username,
                    SenderAvatarUrl = m.Sender.PhotoUrl,
                    Content = m.Content,
                    SentAt = m.SentAt
                }).ToListAsync();
        }

        // 🟢 Marcar como lido
        public async Task<bool> MarkChatAsReadAsync(int chatId, int userId)
        {
            var participant = await _context.ChatParticipants
                .FirstOrDefaultAsync(p => p.ChatId == chatId && p.UserId == userId);

            if (participant == null) return false;

            participant.LastReadMessageAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        // 🟢 Excluir chat para um usuário
        public async Task<bool> DeleteChatAsync(int chatId, int userId)
        {
            var participant = await _context.ChatParticipants.FirstOrDefaultAsync(p => p.ChatId == chatId && p.UserId == userId);

            if (participant == null) return false;

            participant.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        // 🟢 Marca como não lido (volta estado)
        public async Task<bool> MarkChatAsUnreadAsync(int chatId, int userId)
        {
            var participant = await _context.ChatParticipants
                .FirstOrDefaultAsync(p => p.ChatId == chatId && p.UserId == userId);

            if (participant == null) return false;

            participant.LastReadMessageAt = DateTime.MinValue;
            await _context.SaveChangesAsync();
            return true;
        }

        // 🔹 Métodos auxiliares
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
            var lastMsg = chat.Messages.OrderByDescending(m => m.SentAt).FirstOrDefault();

            // Verifica se é um chat 1:1
            if (!chat.IsGroup)
            {
                var participantUsers = chat.Participants
                    .Where(p => !p.IsDeleted)
                    .Select(p => p.User)
                    .ToList();

                // Evita erro se não houver participantes válidos
                if (participantUsers.Count >= 1)
                {
                    var otherUser = participantUsers.FirstOrDefault(u => u.Id != currentUserId) ?? participantUsers.First();

                    chat.Name = otherUser.Username;
                    chat.AvatarUrl = string.IsNullOrEmpty(otherUser.PhotoUrl)
                        ? "/images/default-user.png"
                        : otherUser.PhotoUrl;
                }
            }
            else
            {
                // Grupo: imagem padrão se não tiver nenhuma
                if (string.IsNullOrEmpty(chat.AvatarUrl))
                    chat.AvatarUrl = "/images/default-group.png";
            }

            return new ChatDto
            {
                Id = chat.Id,
                Name = chat.Name,
                AvatarUrl = chat.AvatarUrl,
                IsGroup = chat.IsGroup,
                LastMessage = lastMsg?.Content ?? string.Empty,
                LastMessageTime = lastMsg?.SentAt ?? chat.UpdatedAt,
                Members = chat.Participants.Select(p => new UserChatDto
                {
                    Id = p.User.Id,
                    Username = p.User.Username,
                    PhotoUrl = p.User.PhotoUrl
                }).ToList()
            };
        }

        public async Task<ChatDto?> UpdateGroupAvatarAsync(int chatId, string avatarUrl)
        {
            var chat = await _context.Chats.FirstOrDefaultAsync(c => c.Id == chatId && c.IsGroup);
            if (chat == null) return null;

            chat.AvatarUrl = avatarUrl;
            chat.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return await MapChatToDto(chat);
        }

    }
}
