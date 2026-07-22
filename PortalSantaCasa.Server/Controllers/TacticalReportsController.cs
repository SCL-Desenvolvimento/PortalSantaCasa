using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers;

[ApiController]
[Route("api/tactical-reports")]
[Authorize(Roles = "admin,Admin,editor,Editor")]
public sealed class TacticalReportsController : ControllerBase
{
    private readonly ITacticalReportsService _service;

    public TacticalReportsController(ITacticalReportsService service) => _service = service;

    [HttpGet("catalog")]
    public IActionResult Catalog() => Ok(_service.GetCatalog());

    [HttpGet("{slug}")]
    public async Task<IActionResult> Report(string slug, [FromQuery] string? agentId, CancellationToken cancellationToken)
    {
        if (agentId is { Length: > 100 }) return BadRequest(new { error = "ID de agente inválido." });
        var result = await _service.GetReportAsync(slug, agentId, cancellationToken);
        return result is null ? NotFound(new { error = "Relatório não encontrado." }) : Ok(result);
    }
}
