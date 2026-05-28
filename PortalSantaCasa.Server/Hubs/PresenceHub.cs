using Microsoft.AspNetCore.SignalR;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using System.Security.Claims;
namespace PortalSantaCasa.Server.Hubs
{

    public class PresenceHub : Hub
    {
        private readonly IUserService _userService;

        // Threshold para considerar online (se preferir, use LastActivityUtc do DB)
        private readonly TimeSpan _onlineThreshold = TimeSpan.FromMinutes(2);

        public PresenceHub(IUserService userService)
        {
            _userService = userService;
        }

        // Ao conectar
        public override async Task OnConnectedAsync()
        {
            try
            {
                var userId = GetUserIdFromContext();

                Console.WriteLine($"Presence conectado: {userId}");

                if (userId != null)
                {
                    _userService.AddConnection(userId.Value, Context.ConnectionId);

                    await _userService.UpdateActivityAsync(userId.Value);

                    var online = await _userService.GetOnlineUsersAsync(_onlineThreshold);

                    await Clients.All.SendAsync("UsersOnline",
                        online.Select(u => new
                        {
                            u.Id,
                            userName = u.Username
                        }));
                }

                await base.OnConnectedAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERRO PRESENCE: {ex}");
                throw;
            }
        }

        // Ao desconectar
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetUserIdFromContext();

            if (userId != null)
            {
                _userService.RemoveConnection(userId.Value, Context.ConnectionId);

                // O status online será determinado pelo timeout de 2 minutos (LastActivityUtc).
                // Não marcamos offline imediatamente para permitir reconexões rápidas.

                var online = await _userService.GetOnlineUsersAsync(_onlineThreshold);
                await Clients.All.SendAsync("UsersOnline", online.Select(u => new { u.Id, userName = u.Username }));
            }

            await base.OnDisconnectedAsync(exception);
        }

        // Método chamado pelo cliente periodicamente para atualizar LastActivity (heartbeat)
                public async Task Heartbeat()
        {
            var userId = GetUserIdFromContext();
            if (userId != null)
            {
                await _userService.UpdateActivityAsync(userId.Value);

                // Notifica todos os clientes com lista atualizada de online após o heartbeat
                var online = await _userService.GetOnlineUsersAsync(_onlineThreshold);
                await Clients.All.SendAsync("UsersOnline", online.Select(u => new { u.Id, userName = u.Username }));
            }
        }


        // Ler userId do Claims (assumindo JWT) - fallback para query string se não tiver claims.
        private int? GetUserIdFromContext()
        {
            // se estiver autenticado via JWT e claim "sub" ou "id"
            var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier) ??
                        Context.User?.FindFirst("sub") ??
                        Context.User?.FindFirst("id");

            if (claim != null && int.TryParse(claim.Value, out var id))
                return id;

            // fallback: queryString ?userId=123
            if (Context.GetHttpContext()?.Request.Query.TryGetValue("userId", out var vals) == true)
            {
                if (int.TryParse(vals.FirstOrDefault(), out var qid)) return qid;
            }

            return null;
        }

        // Adicione este método no PresenceHub.cs
        public async Task GetOnlineUsers()
        {
            var online = await _userService.GetOnlineUsersAsync(_onlineThreshold);
            await Clients.Caller.SendAsync("UsersOnline", online.Select(u => new { u.Id, userName = u.Username }));
        }
    }

}
