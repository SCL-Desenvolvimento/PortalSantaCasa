using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Services;

namespace PortalSantaCasa.Server.Controllers;

[ApiController]
[Authorize]
[Route("api/pop-science")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class PopScienceController(PopScienceService service) : ControllerBase
{
    private const string PublisherRoles = "admin,Admin,editor,Editor,superadmin,SuperAdmin";

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var actor = await FindActorAsync(ct);
        return actor is null ? Unauthorized() : Ok(await service.ListAsync(actor, ct));
    }

    [Authorize(Roles = PublisherRoles)]
    [HttpPost]
    [RequestSizeLimit(PopScienceService.MaxPdfBytes + 65536)]
    public Task<IActionResult> Create([FromForm] PopSciencePublishDto dto, CancellationToken ct) => Publish(null, dto, ct);

    [Authorize(Roles = PublisherRoles)]
    [HttpPost("{id:int}/versions")]
    [RequestSizeLimit(PopScienceService.MaxPdfBytes + 65536)]
    public Task<IActionResult> PublishNext(int id, [FromForm] PopSciencePublishDto dto, CancellationToken ct) => Publish(id, dto, ct);

    [HttpGet("{id:int}/versions/{number:int}/content")]
    public async Task<IActionResult> Content(int id, int number, CancellationToken ct)
    {
        var actor = await FindActorAsync(ct);
        if (actor is null) return Unauthorized();
        var file = await service.GetContentAsync(actor, id, number, ct);
        return file is null ? NotFound() : PhysicalFile(file.FullPath, "application/pdf", file.FileName, enableRangeProcessing: true);
    }

    [HttpPost("{id:int}/versions/{number:int}/confirm")]
    public async Task<IActionResult> Confirm(int id, int number, CancellationToken ct)
    {
        var actor = await FindActorAsync(ct);
        if (actor is null) return Unauthorized();
        var confirmedAt = await service.ConfirmAsync(actor, id, number, ct);
        return confirmedAt.HasValue ? Ok(new { confirmedAt }) : NotFound();
    }

    [Authorize(Roles = PublisherRoles)]
    [HttpGet("{id:int}/versions/{number:int}/tracking")]
    public async Task<IActionResult> Tracking(int id, int number, CancellationToken ct)
    {
        var actor = await FindActorAsync(ct);
        if (actor is null) return Unauthorized();
        var records = await service.GetTrackingAsync(actor, id, number, ct);
        return records is null ? NotFound() : Ok(records);
    }

    private async Task<IActionResult> Publish(int? id, PopSciencePublishDto dto, CancellationToken ct)
    {
        var actor = await FindActorAsync(ct);
        if (actor is null) return Unauthorized();
        try
        {
            var result = await service.PublishAsync(actor, id, dto, ct);
            return result is not null ? StatusCode(StatusCodes.Status201Created, result) : id is null ? Forbid() : NotFound();
        }
        catch (PopScienceConflictException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    private Task<PopScienceActor?> FindActorAsync(CancellationToken ct) =>
        int.TryParse(User.FindFirst("id")?.Value, out var id) && id > 0 ? service.FindActorAsync(id, ct) : Task.FromResult<PopScienceActor?>(null);
}
