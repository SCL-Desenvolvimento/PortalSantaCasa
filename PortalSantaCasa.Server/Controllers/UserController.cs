using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _service;
        private readonly PortalSantaCasaDbContext _context;
        private readonly TimeSpan _onlineThreshold = TimeSpan.FromMinutes(2);

        public UserController(IUserService service, PortalSantaCasaDbContext context)
        {
            _service = service;
            _context = context;
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("paginated")]
        public async Task<IActionResult> GetAllPaginated([FromQuery] int page = 1, [FromQuery] int perPage = 10)
        {
            var result = await _service.GetAllPaginatedAsync(page, perPage);
            return Ok(new
            {
                currentPage = page,
                perPage,
                users = result,
                pages = (int)Math.Ceiling(await _service.GetTotalCountAsync() / (double)perPage)
            });
        }

        [AllowAnonymous]
        [HttpGet("departments")]
        public async Task<IActionResult> GetDepartments()
        {
            var departments = await _context.Users
                .AsNoTracking()
                .Select(user => user.Department)
                .ToListAsync();

            var result = departments
                .Where(department => !string.IsNullOrWhiteSpace(department))
                .Select(department => department.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(department => department)
                .ToList();

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromForm] UserCreateDto dto)
        {
            try
            {
                var result = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromForm] UserUpdateDto dto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, dto);
                if (!updated) return NotFound();
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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
        [HttpPost("reset-password/{id}")]
        public async Task<IActionResult> ResetPassword(int id)
        {
            var result = await _service.ResetPasswordAsync(id);

            if (!result)
                return NotFound(new { message = "Usuario nao encontrado." });

            return Ok(new { message = "Senha resetada com sucesso para o padrao." });
        }

        [HttpPost("{id}/change-password")]
        public async Task<IActionResult> ChangePassword(int id, [FromBody] ChangePasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 8)
                return BadRequest(new { message = "A nova senha deve ter pelo menos 8 caracteres." });

            var currentUserId = GetCurrentUserId();
            var isAdmin = User.IsInRole("admin") || User.IsInRole("Admin");

            if (currentUserId != id && !isAdmin)
                return Forbid();

            var result = await _service.ChangePasswordAsync(id, dto.NewPassword);

            if (!result)
                return NotFound(new { message = "Usuario nao encontrado." });

            return Ok(new { message = "Senha alterada com sucesso." });
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] string q)
        {
            var result = await _service.SearchAsync(q);
            return Ok(result);
        }

        [HttpGet("online")]
        public async Task<IActionResult> GetOnline()
        {
            var online = await _service.GetOnlineUsersAsync(_onlineThreshold);
            return Ok(online.Select(u => new { u.Id, u.Username }));
        }

        [HttpPost("heartbeat")]
        public async Task<IActionResult> Heartbeat()
        {
            var userId = GetCurrentUserId();
            await _service.UpdateActivityAsync(userId);
            return Ok();
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("id")?.Value;

            if (int.TryParse(userIdClaim, out var userId))
                return userId;

            throw new UnauthorizedAccessException("Usuario nao autenticado ou ID de usuario nao encontrado.");
        }
    }
}
