using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Security;
using PortalSantaCasa.Server.Services;

namespace PortalSantaCasa.Server.Controllers;

[Authorize]
[ApiController]
[Route("api/department-contacts")]
public sealed class DepartmentContactsController(DepartmentContactService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery, StringLength(100)] string? q, CancellationToken cancellationToken)
    {
        var contacts = await service.SearchAsync(q, 250, cancellationToken, IsSuperAdmin, ManagedDepartment);
        return Ok(new { Items = contacts.Select(View), CanCreate = IsSuperAdmin || ManagedDepartment != null, Department = IsSuperAdmin ? null : ManagedDepartment });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken cancellationToken)
    {
        var contact = await service.GetAsync(id, cancellationToken);
        return contact == null || (!contact.IsActive && !CanEdit(contact.Department)) ? NotFound() : Ok(View(contact));
    }

    [HttpPost]
    public async Task<IActionResult> Create(DepartmentContactInput input, CancellationToken cancellationToken)
    {
        if (!CanEdit(input.Department)) return Forbid();
        if (!HasContact(input)) return BadRequest(new { Message = "Informe um ramal ou um link de atendimento." });
        var contact = await service.SaveAsync(input, null, cancellationToken);
        return Created($"/api/department-contacts/{contact.Id}", View(contact));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, DepartmentContactInput input, CancellationToken cancellationToken)
    {
        var contact = await service.GetAsync(id, cancellationToken);
        if (contact == null) return NotFound();
        if (!CanEdit(contact.Department) || !CanEdit(input.Department)) return Forbid();
        if (!HasContact(input)) return BadRequest(new { Message = "Informe um ramal ou um link de atendimento." });
        if (input.Revision != contact.Revision) return Conflict(Changed());
        try
        {
            return Ok(View(await service.SaveAsync(input, contact, cancellationToken)));
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(Changed());
        }
    }

    private static bool HasContact(DepartmentContactInput input) =>
        input.Extension?.Any(char.IsAsciiDigit) == true || !string.IsNullOrWhiteSpace(input.ChannelUrl);

    private static object Changed() => new { Message = "Outro usuário alterou o contato. Cancele a edição e atualize a busca." };

    private bool IsSuperAdmin => User.IsInRole("superadmin") || User.IsInRole("SuperAdmin");

    private string? ManagedDepartment =>
        (User.IsInRole("admin") || User.IsInRole("Admin") || User.IsInRole("editor") || User.IsInRole("Editor")) &&
        User.FindFirst("department")?.Value.Trim() is { Length: > 0 } department ? department : null;

    private bool CanEdit(string department) => IsSuperAdmin ||
        (ManagedDepartment is { } managed && DepartmentKey.From(managed) == DepartmentKey.From(department));

    private DepartmentContactView View(DepartmentContact contact) => new(contact.Id, contact.Title, contact.Department, contact.Extension,
        contact.Hours, contact.Keywords, contact.ChannelUrl, contact.IsActive, contact.UpdatedAt, CanEdit(contact.Department), contact.Revision);
}
