using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FeedbackController : ControllerBase
    {
        private readonly IFeedbackService _service;

        public FeedbackController(IFeedbackService service)
        {
            _service = service;
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpGet("paginated")]
        public async Task<IActionResult> GetAllPaginated([FromQuery] int page = 1, [FromQuery] int perPage = 10)
        {
            var result = await _service.GetAllPaginatedAsync(page, perPage);
            return Ok(new
            {
                currentPage = page,
                perPage,
                feedbacks = result,
                pages = (int)Math.Ceiling(await _service.GetTotalCountAsync() / (double)perPage)
            });
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] FeedbackCreateDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromForm] FeedbackUpdateDto dto)
        {
            var updated = await _service.UpdateAsync(id, dto);
            if (!updated) return NotFound();
            return NoContent();
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPatch("{id}/mark-as-read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            await _service.MarkAsRead(id);
            return NoContent();
        }

    }
}
