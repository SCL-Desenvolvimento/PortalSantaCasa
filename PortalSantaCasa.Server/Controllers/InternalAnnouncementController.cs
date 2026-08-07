using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InternalAnnouncementController : ControllerBase
    {
        private readonly IInternalAnnouncementService _service;

        public InternalAnnouncementController(IInternalAnnouncementService service)
        {
            _service = service;
        }

        [Authorize(Roles = "admin,Admin,editor,Editor,superadmin,SuperAdmin")]
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var announcements = await _service.GetAllAsync(GetOwnerScope());
            return Ok(announcements);
        }

        [AllowAnonymous]
        [HttpGet("paginated")]
        public async Task<IActionResult> GetAllPaginated([FromQuery] int page = 1, [FromQuery] int perPage = 10,
            [FromQuery] string status = "all")
        {
            const string effectiveStatus = "public";
            var items = await _service.GetAllPaginatedAsync(page, perPage, effectiveStatus);

            var totalCount = await _service.GetTotalCountAsync(effectiveStatus);

            var totalPages = (int)Math.Ceiling(totalCount / (double)perPage);

            return Ok(new
            {
                items,
                currentPage = page,
                perPage,
                totalPages,
                totalCount
            });
        }

        [Authorize(Roles = "admin,Admin,editor,Editor,superadmin,SuperAdmin")]
        [HttpGet("management/paginated")]
        public async Task<IActionResult> GetManagementPaginated([FromQuery] int page = 1, [FromQuery] int perPage = 10,
            [FromQuery] string status = "all")
        {
            var ownerScope = GetOwnerScope();
            var items = await _service.GetAllPaginatedAsync(page, perPage, status, ownerScope);
            var totalCount = await _service.GetTotalCountAsync(status, ownerScope);

            return Ok(new
            {
                items,
                currentPage = page,
                perPage,
                totalPages = (int)Math.Ceiling(totalCount / (double)perPage),
                totalCount
            });
        }

        [AllowAnonymous]
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var announcement = await _service.GetByIdAsync(id);
            var now = DateTimeOffset.UtcNow;
            var isPubliclyVisible =
                announcement is { IsActive: true } &&
                announcement.PublishDate <= now &&
                (!announcement.ExpirationDate.HasValue || announcement.ExpirationDate > now);
            return isPubliclyVisible ? Ok(announcement) : NotFound();
        }

        [Authorize(Roles = "admin,Admin,editor,Editor,superadmin,SuperAdmin")]
        [HttpGet("management/{id:int}")]
        public async Task<IActionResult> GetManagementById(int id)
        {
            var announcement = await _service.GetByIdAsync(id);
            var ownerScope = GetOwnerScope();
            return announcement != null && (!ownerScope.HasValue || announcement.UserId == ownerScope.Value)
                ? Ok(announcement)
                : NotFound();
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] InternalAnnouncementCreateDto dto)
        {
            dto.UserId = GetCurrentUserId();
            var created = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromForm] InternalAnnouncementUpdateDto dto)
        {
            dto.UserId = GetCurrentUserId();
            var updated = await _service.UpdateAsync(id, dto, GetOwnerScope());
            if (updated == null) return NotFound();
            return Ok(updated);
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteAsync(id, GetOwnerScope());
            if (!deleted) return NotFound();
            return NoContent();
        }

        [Authorize(Roles = "admin,Admin,editor,Editor,superadmin,SuperAdmin")]
        [HttpGet("totals")]
        public async Task<IActionResult> GetTotals()
        {
            var totals = await _service.GetTotalsAsync(GetOwnerScope());
            return Ok(totals);
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("id")?.Value;
            if (int.TryParse(userIdClaim, out var userId))
            {
                return userId;
            }

            throw new UnauthorizedAccessException("Usuário não autenticado ou ID de usuário não encontrado.");
        }

        private int? GetOwnerScope() =>
            User.IsInRole("superadmin") || User.IsInRole("SuperAdmin")
                ? null
                : GetCurrentUserId();
    }
}
