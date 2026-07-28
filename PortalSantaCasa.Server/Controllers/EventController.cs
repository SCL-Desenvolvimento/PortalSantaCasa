using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EventController : ControllerBase
    {
        private readonly IEventService _service;

        public EventController(IEventService service)
        {
            _service = service;
        }

        [Authorize(Roles = "admin,Admin,editor,Editor,superadmin,SuperAdmin")]
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync(GetOwnerScope());
            return Ok(result);
        }

        [Authorize(Roles = "admin,Admin,editor,Editor,superadmin,SuperAdmin")]
        [HttpGet("paginated")]
        public async Task<IActionResult> GetAllPaginated([FromQuery] int page = 1, [FromQuery] int perPage = 10)
        {
            var ownerScope = GetOwnerScope();
            var result = await _service.GetAllPaginatedAsync(page, perPage, ownerScope);
            return Ok(new
            {
                currentPage = page,
                perPage,
                events = result,
                pages = (int)Math.Ceiling(await _service.GetTotalCountAsync(ownerScope) / (double)perPage)
            });
        }

        [Authorize(Roles = "admin,Admin,editor,Editor,superadmin,SuperAdmin")]
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id, GetOwnerScope());
            if (result == null) return NotFound();
            return Ok(result);
        }

        [AllowAnonymous]
        [HttpGet("public/{id:int}")]
        public async Task<IActionResult> GetPublicById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            return result is { IsActive: true } ? Ok(result) : NotFound();
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] EventCreateDto dto)
        {
            dto.UserId = GetCurrentUserId();
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromForm] EventUpdateDto dto)
        {
            dto.UserId = GetCurrentUserId();
            var updated = await _service.UpdateAsync(id, dto, GetOwnerScope());
            if (!updated) return NotFound();
            return NoContent();
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteAsync(id, GetOwnerScope());
            if (!deleted) return NotFound();
            return NoContent();
        }

        [AllowAnonymous]
        [HttpGet("next-events")]
        public async Task<IActionResult> GetNextEvents()
        {
            var result = await _service.GetNextEvents();
            return Ok(result);
        }

        [AllowAnonymous]
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string q)
        {
            var result = await _service.SearchAsync(q);
            return Ok(result);
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            if (int.TryParse(userIdClaim, out var userId))
                return userId;

            throw new UnauthorizedAccessException("Usuário não autenticado ou ID de usuário não encontrado.");
        }

        private int? GetOwnerScope() =>
            User.IsInRole("superadmin") || User.IsInRole("SuperAdmin")
                ? null
                : GetCurrentUserId();
    }
}
