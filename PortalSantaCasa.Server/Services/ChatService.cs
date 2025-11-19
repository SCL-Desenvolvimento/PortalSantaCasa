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

        public async Task<ChatDto?> RemoveMemberFromGroupAsync(int chatId, int memberId)
        {
            var chat = await _context.Chats
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == chatId && c.IsGroup);

            if (chat == null) return null;

            var participantToRemove = chat.Participants.FirstOrDefault(p => p.UserId == memberId);

            if (participantToRemove == null) return await MapChatToDto(chat); // Membro não encontrado, retorna o chat atual

            // Remove o participante da coleção
            chat.Participants.Remove(participantToRemove);

            chat.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var chatDto = await MapChatToDto(chat);

            // Notificar o membro removido (se necessário)
            await _hubContext.Clients.User(memberId.ToString()).SendAsync("ChatRemoved", chatId); // Novo evento para notificar remoção

            // Notificar os membros restantes sobre a atualização do chat
            if (chatDto != null)
            {
                await _hubContext.Clients.Group(chatId.ToString()).SendAsync("ChatUpdated", chatDto);
            }

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
                .FirstOrDefaultAsync(c => c.Id == chatId &&
                                          c.Participants.Any(p => p.UserId == userId));

            return chat == null ? null : await MapChatToDto(chat, userId);
        }

        public async Task<IEnumerable<ChatMessageDto>> GetChatMessagesAsync(int chatId, int userId, int skip, int take)
        {
            return await _context.ChatMessages
                .Include(m => m.Sender)
                .Include(m => m.File)
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
                    SentAt = m.SentAt,

                    File = m.File == null
                        ? null
                        : new ChatFileDto
                        {
                            Url = m.File.FilePath,
                            ContentType = m.File.ContentType,
                            FileName = m.File.FileName,
                            Size = m.File.FileSize
                        }
                })
                .ToListAsync();
        }

        public async Task<bool> MarkChatAsReadAsync(int chatId, int userId)
        {
            var participant = await _context.ChatParticipants
                .FirstOrDefaultAsync(p => p.ChatId == chatId && p.UserId == userId);

            if (participant == null) return false;

            participant.LastReadMessageAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // 🔥 NOTIFICAR SOBRE A LEITURA
            await _hubContext.Clients.Group(chatId.ToString()).SendAsync("ChatRead", userId); // Notificar todos no chat que o usuário leu

            // 🔥 ATUALIZAR CONTADOR TOTAL PARA O USUÁRIO
            var totalUnread = await GetTotalUnreadChatsCountAsync(userId);
            await _hubContext.Clients.User(userId.ToString()).SendAsync("UnreadCountUpdate", totalUnread); // Usando o novo método do Hub

            Console.WriteLine($"✅ Chat {chatId} marcado como lido por usuário {userId}. Total não lidos: {totalUnread}");

            return true;
        }

        public async Task<bool> DeleteChatAsync(int chatId, int userId)
        {
            var participant = await _context.ChatParticipants.FirstOrDefaultAsync(p => p.ChatId == chatId && p.UserId == userId);

            if (participant == null) return false;

            participant.IsDeleted = true;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> MarkChatAsUnreadAsync(int chatId, int userId)
        {
            var participant = await _context.ChatParticipants
                .FirstOrDefaultAsync(p => p.ChatId == chatId && p.UserId == userId);

            if (participant == null) return false;

            participant.LastReadMessageAt = DateTime.MinValue;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int> GetTotalUnreadChatsCountAsync(int userId)
        {
            // Busca todos os chats do usuário
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

                // Conta mensagens não lidas (enviadas após a última leitura e não enviadas pelo próprio usuário)
                var unreadMessagesCount = chat.Messages
                    .Count(m => m.SentAt > lastReadTime && m.SenderId != userId);

                if (unreadMessagesCount > 0)
                {
                    totalUnreadChats++;
                }
            }

            return totalUnreadChats;
        }

        public async Task<ChatDto?> UpdateGroupAvatarAsync(int chatId, IFormFile avatar)
        {
            var chat = await _context.Chats.FirstOrDefaultAsync(c => c.Id == chatId && c.IsGroup);
            if (chat == null) return null;


            if (!string.IsNullOrEmpty(chat.AvatarUrl) && avatar != null)
            {
                if (File.Exists(chat.AvatarUrl) && chat.AvatarUrl != "Uploads/Grupos/default-group.png")
                {
                    File.Delete(chat.AvatarUrl);
                }
            }

            if (avatar != null)
            {
                chat.AvatarUrl = await ProcessarMidiasAsync(avatar);
            }

            chat.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var chatDto = await MapChatToDto(chat);

            // Notificar os membros sobre a atualização do chat
            if (chatDto != null)
            {
                await _hubContext.Clients.Group(chatId.ToString()).SendAsync("ChatUpdated", chatDto);
            }

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

            if (chat == null) return null;

            var message = new ChatMessage
            {
                ChatId = chatId,
                SenderId = senderId,
                Content = content,
                SentAt = DateTime.Now
            };

            _context.ChatMessages.Add(message);
            chat.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync(); // gera message.Id

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

            // envia para o grupo
            await _hubContext.Clients.Group(chatId.ToString())
                .SendAsync("ReceiveMessage", dto);

            // notifica participantes
            var others = chat.Participants.Where(p => p.UserId != senderId).ToList();
            foreach (var participant in others)
            {
                var totalUnread = await GetTotalUnreadChatsCountAsync(participant.UserId);
                await _hubContext.Clients.User(participant.UserId.ToString())
                    .SendAsync("UnreadCountUpdate", totalUnread);

                var chatDto = await MapChatToDto(chat, participant.UserId);
                await _hubContext.Clients.User(participant.UserId.ToString())
                    .SendAsync("ChatUpdated", chatDto);
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

            // 1. Calcular mensagens não lidas
            var unreadMessagesCount = chat.Messages
                .Count(m => m.SentAt > lastReadTime && m.SenderId != currentUserId);

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
                        ? "Uploads/Usuarios/default-user.png"
                        : otherUser.PhotoUrl;
                }
            }
            else
            {
                // Grupo: imagem padrão se não tiver nenhuma
                if (string.IsNullOrEmpty(chat.AvatarUrl))
                    chat.AvatarUrl = "Uploads/Grupos/default-group.png";
            }

            return new ChatDto
            {
                Id = chat.Id,
                Name = chat.Name,
                AvatarUrl = chat.AvatarUrl,
                IsGroup = chat.IsGroup,
                UnreadMessagesCount = unreadMessagesCount, // Adicionado o contador
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

        private static async Task<string?> ProcessarMidiasAsync(IFormFile midia)
        {
            if (midia == null) return null;

            // Define o caminho para a pasta "Grupos"
            var baseDirectory = Path.Combine("Uploads", "Grupos").Replace("\\", "/");

            // Verifica se a pasta "Grupos" existe, e a cria caso não exista
            if (!Directory.Exists(baseDirectory))
            {
                Directory.CreateDirectory(baseDirectory);
            }

            // Gera o caminho completo para o arquivo dentro da pasta "Grupos"
            var filePath = Path.Combine(baseDirectory, Guid.NewGuid() + Path.GetExtension(midia.FileName)).Replace("\\", "/");

            // Salva o arquivo no caminho especificado
            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await midia.CopyToAsync(stream);
            }

            return filePath;
        }

        private async Task<List<ChatMessageFile>> ProcessarChatMidiasAsync(int chatId, int messageId, IEnumerable<IFormFile>? files)
        {
            var savedFiles = new List<ChatMessageFile>();

            if (files == null)
                return savedFiles;

            // mesma lógica do processarMidias
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

                await using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var fileEntity = new ChatMessageFile
                {
                    MessageId = messageId,
                    FileName = safeName,
                    FilePath = filePath.Replace("\\", "/"),
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
}
