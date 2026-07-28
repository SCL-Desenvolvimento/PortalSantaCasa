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
            var result = await _service.GetAllAsync(GetDepartmentScope());
            return Ok(result);
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpGet("paginated")]
        public async Task<IActionResult> GetAllPaginated([FromQuery] int page = 1, [FromQuery] int perPage = 10)
        {
            var departmentScope = GetDepartmentScope();
            var result = await _service.GetAllPaginatedAsync(page, perPage, departmentScope);
            return Ok(new
            {
                currentPage = page,
                perPage,
                feedbacks = result,
                pages = (int)Math.Ceiling(await _service.GetTotalCountAsync(departmentScope) / (double)perPage)
            });
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id, GetDepartmentScope());
            if (result == null) return NotFound();
            return Ok(result);
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] FeedbackCreateDto dto)
        {
            dto.Name = User.FindFirst("username")?.Value ?? User.Identity?.Name ?? string.Empty;
            dto.Email = User.FindFirst("email")?.Value;
            dto.Department = User.FindFirst("department")?.Value;
            dto.IsRead = false;
            var result = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromForm] FeedbackUpdateDto dto)
        {
            var departmentScope = GetDepartmentScope();
            if (departmentScope != null)
                dto.TargetDepartment = departmentScope;

            var updated = await _service.UpdateAsync(id, dto, departmentScope);
            if (!updated) return NotFound();
            return NoContent();
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteAsync(id, GetDepartmentScope());
            if (!deleted) return NotFound();
            return NoContent();
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPatch("{id}/mark-as-read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var updated = await _service.MarkAsRead(id, GetDepartmentScope());
            return updated ? NoContent() : NotFound();
        }

        private string? GetDepartmentScope() =>
            User.IsInRole("superadmin") || User.IsInRole("SuperAdmin")
                ? null
                : User.FindFirst("department")?.Value;

    }
}
