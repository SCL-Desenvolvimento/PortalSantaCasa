using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers;

[ApiController]
[Route("api/benefits")]
public class BenefitsController(IBenefitService service) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetPublic() => Ok(await service.GetPublicAsync());

    [Authorize(Roles = "admin,Admin")]
    [HttpGet("admin")]
    public async Task<IActionResult> GetAdmin() => Ok(await service.GetAdminAsync());

    [Authorize(Roles = "admin,Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(BenefitDto dto)
    {
        var benefit = await service.CreateAsync(dto);
        return StatusCode(StatusCodes.Status201Created, benefit);
    }

    [Authorize(Roles = "admin,Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, BenefitDto dto)
    {
        var benefit = await service.UpdateAsync(id, dto);
        if (benefit is null) return NotFound();
        return Ok(benefit);
    }

    [Authorize(Roles = "admin,Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await service.DeleteAsync(id)) return NotFound();
        return NoContent();
    }
}
