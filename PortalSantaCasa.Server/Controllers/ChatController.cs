using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Shared.DTOs.Chat;

namespace PortalSantaCasa.Server.Controllers;

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
        var userId = GetCurrentUserId();
        var chat = await _chatService.StartNewChatAsync(userId, dto.TargetUserId);
        return Ok(chat);
    }

    [HttpPost("group")]
    public async Task<ActionResult<ChatDto>> CreateGroupChat([FromBody] CreateGroupDto dto)
    {
        var creatorId = GetCurrentUserId();
        var chat = await _chatService.CreateGroupChatAsync(creatorId, dto.GroupName, dto.MemberIds);
        return Ok(chat);
    }

    [HttpPost("{chatId}/members")]
    public async Task<ActionResult<ChatDto>> AddMembersToGroup(int chatId, [FromBody] AddMembersDto dto)
    {
        var addedByUserId = GetCurrentUserId();
        var chat = await _chatService.AddMembersToGroupAsync(chatId, dto.MemberIds, addedByUserId);
        return Ok(chat);
    }

    [HttpPost("{chatId}/remove-member")]
    public async Task<ActionResult<ChatDto>> RemoveMemberFromGroup(int chatId, [FromBody] RemoveMemberDto dto)
    {
        var removedByUserId = GetCurrentUserId();
        var chat = await _chatService.RemoveMemberFromGroupAsync(chatId, dto.MemberId, removedByUserId);
        return Ok(chat);
    }

    [HttpDelete("{chatId}")]
    public async Task<ActionResult> DeleteChat(int chatId)
    {
        var userId = GetCurrentUserId();

        var success = await _chatService.DeleteChatAsync(chatId, userId);

        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpPost("{chatId}/read")]
    public async Task<ActionResult> MarkAsRead(int chatId)
    {
        var userId = GetCurrentUserId();

        var success = await _chatService.MarkChatAsReadAsync(chatId, userId);

        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpPost("{chatId}/unread")]
    public async Task<ActionResult> MarkAsUnread(int chatId)
    {
        var userId = GetCurrentUserId();

        var success = await _chatService.MarkChatAsUnreadAsync(chatId, userId);

        if (!success)
            return NotFound();

        return NoContent();
    }

    [HttpPost("{chatId}/avatar")]
    public async Task<ActionResult<ChatDto>> UploadGroupAvatar(int chatId, IFormFile avatar)
    {
        if (avatar == null || avatar.Length == 0)
            return BadRequest("Nenhuma imagem enviada.");

        var userId = GetCurrentUserId();
        var updatedChat = await _chatService.UpdateGroupAvatarAsync(chatId, userId, avatar);

        if (updatedChat == null)
            return Forbid();

        return Ok(updatedChat);
    }

    [HttpGet("total-unread-count")]
    public async Task<ActionResult<int>> GetTotalUnreadChatsCount()
    {
        var userId = GetCurrentUserId();
        var count = await _chatService.GetTotalUnreadChatsCountAsync(userId);
        return Ok(count);
    }

    [HttpPost("{chatId}/send")]
    public async Task<ActionResult<ChatMessageDto>> SendFile(
        int chatId,
        [FromForm] string? content,
        [FromForm] IFormFileCollection? files)
    {
        var senderId = GetCurrentUserId();

        var result = await _chatService.SendMessageAsync(chatId, senderId, content, files);

        if (result == null)
            return NotFound();

        return Ok(result);
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst("id")?.Value;

        if (int.TryParse(userIdClaim, out var userId))
            return userId;

        throw new UnauthorizedAccessException("Usuário não autenticado ou ID de usuário não encontrado.");
    }
}
