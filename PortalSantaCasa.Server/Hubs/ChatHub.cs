using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Hubs
{
    public class ChatHub : Hub
    {
        // Método para notificar que um chat foi atualizado (ex: membros adicionados)
        public async Task ChatUpdated(ChatDto chat)
        {
            await Clients.Group(chat.Id.ToString()).SendAsync("ChatUpdated", chat);
        }
        // Método para enviar uma mensagem para um chat específico
        public async Task SendMessage(int chatId, ChatMessageDto message)
        {
            // O grupo será o ID do chat. Todos os participantes do chat estarão neste grupo.
            await Clients.Group(chatId.ToString()).SendAsync("ReceiveMessage", message);
        }

        // Método para adicionar um usuário a um grupo (chat)
        public async Task JoinChat(int chatId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, chatId.ToString());
            Console.WriteLine($"✅ Usuário {Context.ConnectionId} entrou no chat {chatId}");
        }

        // Método para remover um usuário de um grupo (chat)
        public async Task LeaveChat(int chatId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, chatId.ToString());
            Console.WriteLine($"🚪 Usuário {Context.ConnectionId} saiu do chat {chatId}");
        }

        public override async Task OnConnectedAsync()
        {
            Console.WriteLine($"🔗 Usuário conectado: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine($"🔌 Usuário desconectado: {Context.ConnectionId}");
            await base.OnDisconnectedAsync(exception);
        }

        // Método para notificar que um chat foi lido
        public async Task ChatRead(int chatId, int userId)
        {
            await Clients.Group(chatId.ToString()).SendAsync("ChatRead", userId);
        }

        // Método para notificar que um novo chat foi criado (para o usuário envolvido)
        public async Task NewChatCreated(int userId, ChatDto chat)
        {
            // Envia apenas para o usuário específico (usando o ID do usuário como nome do grupo/conexão)
            await Clients.User(userId.ToString()).SendAsync("NewChat", chat);
        }
    }
}
