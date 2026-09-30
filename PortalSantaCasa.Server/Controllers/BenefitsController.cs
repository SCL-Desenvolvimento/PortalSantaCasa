using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Controllers;

[ApiController]
[Route("api/benefits")]
public class BenefitsController(PortalSantaCasaDbContext db) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetPublic() => Ok(await db.Benefits.AsNoTracking()
        .Where(b => b.IsActive).OrderBy(b => b.Category).ThenBy(b => b.Title).ToListAsync());

    [Authorize(Roles = "admin,Admin")]
    [HttpGet("admin")]
    public async Task<IActionResult> GetAdmin() => Ok(await db.Benefits.AsNoTracking()
        .OrderBy(b => b.Title).ToListAsync());

    [Authorize(Roles = "admin,Admin")]
    [HttpPost]
    public async Task<IActionResult> Create(BenefitDto dto)
    {
        var benefit = new Benefit();
        Apply(benefit, dto);
        db.Benefits.Add(benefit);
        await db.SaveChangesAsync();
        return StatusCode(StatusCodes.Status201Created, benefit);
    }

    [Authorize(Roles = "admin,Admin")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, BenefitDto dto)
    {
        var benefit = await db.Benefits.FindAsync(id);
        if (benefit is null) return NotFound();
        Apply(benefit, dto);
        await db.SaveChangesAsync();
        return Ok(benefit);
    }

    [Authorize(Roles = "admin,Admin")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var benefit = await db.Benefits.FindAsync(id);
        if (benefit is null) return NotFound();
        db.Benefits.Remove(benefit);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static void Apply(Benefit benefit, BenefitDto dto)
    {
        benefit.Title = dto.Title.Trim();
        benefit.Description = dto.Description.Trim();
        benefit.Category = (dto.Category ?? "").Trim();
        benefit.Eligibility = (dto.Eligibility ?? "").Trim();
        benefit.HowToAccess = (dto.HowToAccess ?? "").Trim();
        benefit.Link = string.IsNullOrWhiteSpace(dto.Link) ? null : dto.Link.Trim();
        benefit.IsActive = dto.IsActive;
    }
}
