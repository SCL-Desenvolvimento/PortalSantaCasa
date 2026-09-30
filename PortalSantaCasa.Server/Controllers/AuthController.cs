using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;
using System.Security.Authentication;

namespace PortalSantaCasa.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]
public class AuthController(IAuthService service) : ControllerBase
{
    [Authorize(Roles = "admin,Admin")]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromForm] UserCreateDto dto)
    {
        try
        {
            var isSuperAdmin = User.IsInRole("superadmin") || User.IsInRole("SuperAdmin");
            return Ok(new { token = await service.RegisterAsync(dto, isSuperAdmin) });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (ArgumentException ex) { return BadRequest(ex.Message); }
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        try { return Ok(await service.LoginAsync(dto)); }
        catch (AuthenticationException ex) { return Unauthorized(ex.Message); }
    }

    [Authorize(Policy = "PasswordChangeOnly")]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangeInitialPassword([FromBody] ChangePasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length is < 8 or > 128)
            return BadRequest(new { message = "A nova senha deve ter entre 8 e 128 caracteres." });

        if (!int.TryParse(User.FindFirst("id")?.Value, out var userId))
            return Unauthorized(new { message = "Token de troca de senha inválido." });

        try
        {
            await service.ChangeInitialPasswordAsync(userId, dto.NewPassword);
            return Ok(new { message = "Senha alterada com sucesso." });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
