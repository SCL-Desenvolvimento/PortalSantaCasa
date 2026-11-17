using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Services;

namespace PortalSantaCasa.Server.Controllers;

[Authorize]
[ApiController]
[Route("api/contingencies")]
public sealed class ContingenciesController(ContingencyService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool includeResolved, CancellationToken cancellationToken) =>
        Ok(new { Items = await service.ListAsync(includeResolved, cancellationToken), CanPublish });

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken cancellationToken)
    {
        var incident = await service.GetAsync(id, cancellationToken);
        return incident == null ? NotFound() : Ok(incident);
    }

    [HttpPost]
    public async Task<IActionResult> Create(ContingencyCreateInput input, CancellationToken cancellationToken)
    {
        if (!CanPublish) return Forbid();
        if (!ValidScope(input.Departments, input.Extension, input.Procedure) || !Future(input.NextUpdateAt))
            return BadRequest(new { Message = "Informe os setores, o ramal, o procedimento e um horário futuro para a próxima atualização." });

        var incident = await service.CreateAsync(input, Author, cancellationToken);
        return Created($"/api/contingencies/{incident.Id}", incident);
    }

    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, ContingencyUpdateInput input, CancellationToken cancellationToken)
    {
        if (!CanPublish) return Forbid();
        if (!ValidScope(input.Departments, input.Extension, input.Procedure) || (input.Status != "resolved" && !Future(input.NextUpdateAt)))
            return BadRequest(new { Message = "Confira os dados do aviso e informe um horário futuro para a próxima atualização." });
        try
        {
            var incident = await service.UpdateAsync(id, input, Author, cancellationToken);
            return incident == null ? NotFound() : Ok(incident);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { Message = "O aviso foi alterado ou encerrado. Atualize o painel e confira o histórico." });
        }
    }

    private static bool Future(DateTimeOffset? value) => value > DateTimeOffset.UtcNow;

    private static bool ValidScope(string[]? departments, string? extension, string? procedure) =>
        (departments == null || (departments.Length > 0 && departments.All(item => item?.Trim() is { Length: > 0 and <= 120 }))) &&
        (extension == null || extension.Any(char.IsAsciiDigit)) && (procedure == null || !string.IsNullOrWhiteSpace(procedure));

    private string Author => User.FindFirst("username")?.Value ?? User.Identity?.Name ?? "TI";

    private bool CanPublish => User.IsInRole("superadmin") || User.IsInRole("SuperAdmin") ||
        ((User.IsInRole("admin") || User.IsInRole("Admin") || User.IsInRole("editor") || User.IsInRole("Editor")) &&
         User.FindFirst("department")?.Value.Trim().ToLowerInvariant() is "informática" or "ti");
}
