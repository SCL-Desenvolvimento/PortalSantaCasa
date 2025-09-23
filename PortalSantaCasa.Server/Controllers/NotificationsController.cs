using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _service;

        public NotificationsController(INotificationService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var notifications = await _service.GetAllNotificationsAsync();
            return Ok(notifications);
        }

        [HttpGet("unread")]
        public async Task<IActionResult> GetUnread()
        {
            var notifications = await _service.GetUnreadNotificationsAsync();
            return Ok(notifications);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] NotificationCreateDto dto)
        {
            var notification = await _service.CreateNotificationAsync(dto.Type, dto.Title, dto.Message, dto.Link);
            return Ok(notification);
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            await _service.MarkAsReadAsync(id);
            return NoContent();
        }
    }
}
