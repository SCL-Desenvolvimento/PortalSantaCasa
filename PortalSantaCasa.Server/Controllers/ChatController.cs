using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;


namespace PortalSantaCasa.Server.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;

        public ChatController(IChatService chatService)
        {
            _chatService = chatService;
        }

	        [HttpGet]
	        public async Task<ActionResult<IEnumerable<ChatDto>>> GetUserChats()
	        {
	            var userId = GetCurrentUserId();
	            var chats = await _chatService.GetUserChatsAsync(userId);
	            return Ok(chats);
	        }

	        [HttpGet("{chatId}/messages")]
	        public async Task<ActionResult<IEnumerable<ChatMessageDto>>> GetChatMessages(
	            int chatId,
	            [FromQuery] int skip = 0,
	            [FromQuery] int take = 50)
	        {
	            var userId = GetCurrentUserId();
	            var messages = await _chatService.GetChatMessagesAsync(chatId, userId, skip, take);
	            return Ok(messages);
	        }

	        [HttpPost("start")]
	        public async Task<ActionResult<ChatDto>> StartNewChat([FromBody] StartChatDto dto)
	        {
	            var chat = await _chatService.StartNewChatAsync(dto.UserId, dto.TargetUserId);
	            return CreatedAtAction(nameof(GetUserChats), chat);
	        }

	        [HttpPost("group")]
	        public async Task<ActionResult<ChatDto>> CreateGroupChat([FromBody] CreateGroupDto dto)
	        {
	            var chat = await _chatService.CreateGroupChatAsync(dto.CreatorId, dto.GroupName, dto.MemberIds);
	            return CreatedAtAction(nameof(GetUserChats), chat);
	        }

        [HttpPost("{chatId}/members")]
        public async Task<ActionResult<ChatDto>> AddMembersToGroup(int chatId, [FromBody] AddMembersDto dto)
        {
            var chat = await _chatService.AddMembersToGroupAsync(chatId, dto.MemberIds);
            return Ok(chat);
        }

	        [HttpPost("{chatId}/send")]
	        public async Task<ActionResult<ChatMessageDto>> SendMessage(int chatId, [FromBody] SendMessageDto dto)
	        {
	            var userId = GetCurrentUserId();
	            var message = await _chatService.SendMessageAsync(chatId, userId, dto.Content);
	            return Ok(message);
	        }

	        [HttpDelete("{chatId}")]
	        public async Task<ActionResult> DeleteChat(int chatId)
	        {
	            var userId = GetCurrentUserId();
	            var success = await _chatService.DeleteChatAsync(chatId, userId);
	            if (!success) return NotFound();
	            return NoContent();
	        }

	        [HttpPost("{chatId}/read")]
	        public async Task<ActionResult> MarkAsRead(int chatId)
	        {
	            var userId = GetCurrentUserId();
	            var success = await _chatService.MarkChatAsReadAsync(chatId, userId);
	            if (!success) return NotFound();
	            return NoContent();
	        }

	        [HttpPost("{chatId}/unread")]
	        public async Task<ActionResult> MarkAsUnread(int chatId)
	        {
	            var userId = GetCurrentUserId();
	            var success = await _chatService.MarkChatAsUnreadAsync(chatId, userId);
	            if (!success) return NotFound();
	            return NoContent();
	        }

	        [HttpPost("{chatId}/avatar")]
	        public async Task<ActionResult<ChatDto>> UploadGroupAvatar(int chatId, IFormFile avatar)
	        {
	            if (avatar == null || avatar.Length == 0)
	                return BadRequest("Nenhuma imagem enviada.");

            var filePath = Path.Combine("wwwroot/uploads/groups", $"{Guid.NewGuid()}{Path.GetExtension(avatar.FileName)}");

            Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await avatar.CopyToAsync(stream);
            }

	            var updatedChat = await _chatService.UpdateGroupAvatarAsync(chatId, filePath.Replace("wwwroot", string.Empty));
	            return Ok(updatedChat);
	        }

	        [HttpGet("total-unread-count")]
	        public async Task<ActionResult<int>> GetTotalUnreadChatsCount()
	        {
	            var userId = GetCurrentUserId();
	            var count = await _chatService.GetTotalUnreadChatsCountAsync(userId);
	            return Ok(count);
	        }

	        // Método auxiliar para obter o ID do usuário logado (simulação)
	        private int GetCurrentUserId()
	        {
	            // Implementação real deve usar ClaimsPrincipal ou outro mecanismo de autenticação
	            // Para fins de teste e demonstração, estou assumindo que o ID do usuário está disponível
	            // no contexto de autenticação. Se o seu projeto usa um mecanismo diferente,
	            // você precisará ajustar esta parte.
	            var userIdClaim = User.FindFirst("id")?.Value; // Exemplo: buscando um claim "id"
	            if (int.TryParse(userIdClaim, out var userId))
	            {
	                return userId;
	            }

	            // Se não for possível obter o ID do usuário autenticado, você pode lançar uma exceção
	            // ou retornar um valor padrão, dependendo da sua lógica de negócio.
	            // Para este contexto, vou retornar 0 ou lançar uma exceção se a autenticação for obrigatória.
	            // Como o controller tem [Authorize], vou assumir que o User.FindFirst("id") funciona.
	            // Se o seu ID de usuário for um GUID ou string, o tipo de retorno e o parse precisarão ser ajustados.
	            throw new UnauthorizedAccessException("Usuário não autenticado ou ID de usuário não encontrado.");
	        }

	    }
	}
