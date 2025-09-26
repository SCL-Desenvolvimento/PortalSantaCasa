using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace SocialPublisher.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PostsController : ControllerBase
    {
        private readonly ISocialPublisherService _socialPublisherService;

        public PostsController(ISocialPublisherService socialPublisherService)
        {
            _socialPublisherService = socialPublisherService;
        }

        [HttpPost("publish")]
        public async Task<IActionResult> Publish([FromBody] PostCreateDto postDto)
        {
            if (postDto.ScheduledAtUtc.HasValue)
            {
                await _socialPublisherService.ScheduleAsync(postDto);
                return Ok("Post agendado com sucesso.");
            }
            else
            {
                await _socialPublisherService.PublishAsync(postDto);
                return Ok("Post publicado imediatamente com sucesso.");
            }
        }
    }
}
