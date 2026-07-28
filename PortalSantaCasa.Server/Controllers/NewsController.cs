using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NewsController : ControllerBase
    {
        private readonly INewsService _service;

        public NewsController(INewsService service)
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


        [AllowAnonymous]
        [HttpGet("paginated")]
        public async Task<IActionResult> GetAllPaginated([FromQuery] int page = 1, [FromQuery] int perPage = 10,
            [FromQuery] bool? isQualityMinute = null, [FromQuery] string status = "all")
        {
            var effectiveStatus = IsContentManager() ? status : "active";
            var ownerScope = IsContentManager() ? GetOwnerScope() : null;
            var result = await _service.GetAllPaginatedAsync(page, perPage, isQualityMinute, effectiveStatus, ownerScope);
            return Ok(new
            {
                currentPage = page,
                perPage,
                news = result,
                pages = (int)Math.Ceiling(await _service.GetTotalCountAsync(isQualityMinute, effectiveStatus, ownerScope) / (double)perPage)
            });
        }

        [AllowAnonymous]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            var ownerScope = IsContentManager() ? GetOwnerScope() : null;
            if (result == null ||
                (!result.IsActive &&
                 (!IsContentManager() ||
                  (ownerScope.HasValue && result.UserId != ownerScope.Value))))
            {
                return NotFound();
            }
            return Ok(result);
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] NewsCreateDto dto)
        {
            dto.UserId = GetCurrentUserId();
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromForm] NewsUpdateDto dto)
        {
            dto.UserId = GetCurrentUserId();
            var updated = await _service.UpdateAsync(id, dto, GetOwnerScope());
            if (!updated) return NotFound();
            return NoContent();
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteAsync(id, GetOwnerScope());
            if (!deleted) return NotFound();
            return NoContent();
        }

        [AllowAnonymous]
        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string q)
        {
            var isManager = IsContentManager();
            var result = await _service.SearchAsync(
                q,
                isManager ? GetOwnerScope() : null,
                activeOnly: !isManager);
            return Ok(result);
        }

        [Authorize(Roles = "admin,Admin,editor,Editor,superadmin,SuperAdmin")]
        [HttpGet("totals")]
        public async Task<IActionResult> GetTotals(bool? isQualityMinute)
        {
            var totals = await _service.GetTotalsAsync(isQualityMinute, GetOwnerScope());
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

        private bool IsContentManager() =>
            User.Identity?.IsAuthenticated == true &&
            (User.IsInRole("admin") || User.IsInRole("Admin") ||
             User.IsInRole("editor") || User.IsInRole("Editor") ||
             User.IsInRole("superadmin") || User.IsInRole("SuperAdmin"));

        private int? GetOwnerScope() =>
            User.IsInRole("superadmin") || User.IsInRole("SuperAdmin")
                ? null
                : GetCurrentUserId();

    }
}
