using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;
using System.Security.Claims;

namespace PortalSantaCasa.Server.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _service;

        public NotificationsController(INotificationService service)
        {
            _service = service;
        }

        private int GetUserId() => int.Parse(User.FindFirstValue("id"));

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var notifications = await _service.GetAllNotificationsAsync();
            return Ok(notifications);
        }

        [HttpGet("usernotifications")]
        public async Task<IActionResult> GetUserNotifications()
        {
            var userId = GetUserId();
            var notifications = await _service.GetUserNotificationsAsync(userId);
            return Ok(notifications);
        }

        [HttpGet("unread")]
        public async Task<IActionResult> GetUnread()
        {
            var userId = GetUserId();
            var notifications = await _service.GetUnreadUserNotificationsAsync(userId);
            return Ok(notifications);
        }

        [HttpGet("unread/count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userId = GetUserId();
            var count = await _service.GetUnreadCountAsync(userId);
            return Ok(count);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] NotificationCreateDto dto)
        {
            var notification = await _service.CreateNotificationAsync(dto);
            return Ok(notification);
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var userId = GetUserId();
            await _service.MarkAsReadAsync(id, userId);
            return NoContent();
        }

        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = GetUserId();
            await _service.MarkAllAsReadAsync(userId);
            return NoContent();
        }
    }
}
