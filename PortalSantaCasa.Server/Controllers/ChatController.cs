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
        private readonly IUserService _userService;

        public ChatController(IChatService chatService, IUserService userService)
        {
            _chatService = chatService;
            _userService = userService;
        }

        [HttpGet("{userId}")]
        public async Task<ActionResult<IEnumerable<ChatDto>>> GetUserChats(int userId)
        {
            var chats = await _chatService.GetUserChatsAsync(userId);
            return Ok(chats);
        }

        [HttpGet("{chatId}/messages/{userId}")]
        public async Task<ActionResult<IEnumerable<ChatMessageDto>>> GetChatMessages(
            int chatId,
            int userId,
            [FromQuery] int skip = 0,
            [FromQuery] int take = 50)
        {
            var messages = await _chatService.GetChatMessagesAsync(chatId, userId, skip, take);
            return Ok(messages);
        }

        [HttpPost("start")]
        public async Task<ActionResult<ChatDto>> StartNewChat([FromBody] StartChatDto dto)
        {
            var chat = await _chatService.StartNewChatAsync(dto.UserId, dto.TargetUserId);
            return CreatedAtAction(nameof(GetUserChats), new { userId = dto.UserId }, chat);
        }

        [HttpPost("group")]
        public async Task<ActionResult<ChatDto>> CreateGroupChat([FromBody] CreateGroupDto dto)
        {
            var chat = await _chatService.CreateGroupChatAsync(dto.CreatorId, dto.GroupName, dto.MemberIds);
            return CreatedAtAction(nameof(GetUserChats), new { userId = dto.CreatorId }, chat);
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
            var message = await _chatService.SendMessageAsync(chatId, dto.SenderId, dto.Content);
            return Ok(message);
        }

        [HttpDelete("{chatId}/{userId}")]
        public async Task<ActionResult> DeleteChat(int chatId, int userId)
        {
            var success = await _chatService.DeleteChatAsync(chatId, userId);
            if (!success) return NotFound();
            return NoContent();
        }

        [HttpPost("{chatId}/read/{userId}")]
        public async Task<ActionResult> MarkAsRead(int chatId, int userId)
        {
            var success = await _chatService.MarkChatAsReadAsync(chatId, userId);
            if (!success) return NotFound();
            return NoContent();
        }

        [HttpPost("{chatId}/unread/{userId}")]
        public async Task<ActionResult> MarkAsUnread(int chatId, int userId)
        {
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

    }
}
