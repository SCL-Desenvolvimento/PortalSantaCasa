using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Utils;

namespace PortalSantaCasa.Server.Controllers;

[ApiController]
[Authorize]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/internalrequests")]
public sealed class InternalRequestsController(PortalSantaCasaDbContext db) : ControllerBase
{
    private const string Received = "recebida";
    private const string InProgress = "em-andamento";
    private const string Completed = "concluida";
    private static readonly InternalRequestServiceDto BadgeReplacement =
        new("segunda-via-cracha", "Segunda via de crachá", "Departamento Pessoal");

    [HttpGet("catalog")]
    public IActionResult GetCatalog() => TryGetActorId(out _)
        ? Ok(new InternalRequestCatalogDto(ManagedRequests() is not null, [BadgeReplacement]))
        : Unauthorized();

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(int page = 1, int perPage = 15, CancellationToken cancellationToken = default)
    {
        if (!TryGetActorId(out var actorId)) return Unauthorized();
        return Ok(await ReadPage(db.Set<InternalRequest>().Where(request => request.RequesterId == actorId),
            page, perPage, cancellationToken));
    }

    [HttpGet("queue")]
    public async Task<IActionResult> GetQueue(int page = 1, int perPage = 15, CancellationToken cancellationToken = default)
    {
        if (!TryGetActorId(out _)) return Unauthorized();
        var managed = ManagedRequests();
        if (managed is null) return Forbid();
        return Ok(await ReadPage(managed, page, perPage, cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        if (!TryGetActorId(out var actorId)) return Unauthorized();
        var owned = db.Set<InternalRequest>().Where(request => request.RequesterId == actorId);
        var managed = ManagedRequests();
        var visible = managed is null ? owned : owned.Union(managed);
        var request = await ReadRequest(visible, id, cancellationToken);
        return request is null ? NotFound() : Ok(Detail(request));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateInternalRequestDto input, CancellationToken cancellationToken)
    {
        if (!TryGetActorId(out var actorId)) return Unauthorized();
        if (input.ServiceCode != BadgeReplacement.Code || input.OperationId == Guid.Empty)
            return BadRequest(new ProblemDetails { Detail = "Selecione um serviço disponível para abrir a solicitação." });

        var prior = await FindOperation(actorId, input.OperationId, cancellationToken);
        if (prior is not null) return await ReplayCreation(prior, cancellationToken);

        var actorName = User.Identity!.Name!;
        var now = DateTimeOffset.UtcNow;
        var request = new InternalRequest
        {
            RequesterId = actorId,
            RequesterName = actorName,
            ServiceCode = BadgeReplacement.Code,
            ServiceName = BadgeReplacement.Name,
            Department = BadgeReplacement.Department,
            Status = Received,
            CreatedAt = now,
            Version = 1,
            History = [new InternalRequestEvent
            {
                Version = 1, OperationId = input.OperationId, ActorId = actorId,
                ActorName = actorName, Status = Received, CreatedAt = now
            }]
        };
        db.Set<InternalRequest>().Add(request);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
            var saved = await FindOperation(actorId, input.OperationId, cancellationToken);
            if (saved is null) throw;
            return await ReplayCreation(saved, cancellationToken);
        }

        return CreatedAtAction(nameof(GetById), new { id = request.Id }, Detail(request));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateInternalRequestDto input, CancellationToken cancellationToken)
    {
        if (!TryGetActorId(out var actorId)) return Unauthorized();
        var managed = ManagedRequests();
        if (managed is null) return Forbid();
        var reply = string.IsNullOrWhiteSpace(input.Reply) ? null : input.Reply.Trim();
        if (input.OperationId == Guid.Empty || input.Version < 1 ||
            input.Status is not (Received or InProgress or Completed) || reply?.Length > 1000)
            return BadRequest(new ProblemDetails { Detail = "Revise o andamento e o retorno, limitado a 1.000 caracteres." });

        var request = await managed.Include(item => item.History)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (request is null) return NotFound();

        var prior = await FindOperation(actorId, input.OperationId, cancellationToken);
        if (prior is not null) return ReplayUpdate(request, prior, input, reply);
        if (request.Version != input.Version) return StaleVersion();
        if (request.Status == Completed || (request.Status == InProgress && input.Status == Received))
            return BadRequest(new ProblemDetails { Detail = "O andamento informado não pode ser aplicado a esta solicitação." });
        if (input.Status == Completed && reply is null)
            return BadRequest(new ProblemDetails { Detail = "Informe um retorno ao colaborador para concluir a solicitação." });
        if (request.Status == input.Status && request.DueDate == input.DueDate && reply is null)
            return BadRequest(new ProblemDetails { Detail = "Altere o andamento, o prazo ou escreva um retorno antes de salvar." });

        request.Status = input.Status;
        request.DueDate = input.DueDate;
        request.Version++;
        db.Set<InternalRequestEvent>().Add(new InternalRequestEvent
        {
            InternalRequestId = request.Id,
            Version = request.Version,
            OperationId = input.OperationId,
            ActorId = actorId,
            ActorName = User.Identity!.Name!,
            Status = request.Status,
            DueDate = request.DueDate,
            Reply = reply,
            CreatedAt = DateTimeOffset.UtcNow
        });

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException error)
        {
            db.ChangeTracker.Clear();
            var saved = await FindOperation(actorId, input.OperationId, cancellationToken);
            var latest = await ReadRequest(managed, id, cancellationToken);
            if (latest is null) return NotFound();
            if (saved is not null) return ReplayUpdate(latest, saved, input, reply);
            if (latest.Version != input.Version || error is DbUpdateConcurrencyException) return StaleVersion();
            throw;
        }

        return Ok(Detail(request));
    }

    private bool TryGetActorId(out int id) =>
        int.TryParse(User.FindFirst("id")?.Value, out id) && id > 0 &&
        User.Identity is { IsAuthenticated: true, Name.Length: > 0 };

    private IQueryable<InternalRequest>? ManagedRequests()
    {
        var requests = db.Set<InternalRequest>();
        var roles = User.FindAll("role").Select(claim => claim.Value);
        if (roles.Contains("superadmin", StringComparer.OrdinalIgnoreCase)) return requests;
        if (!roles.Contains("admin", StringComparer.OrdinalIgnoreCase) && !roles.Contains("editor", StringComparer.OrdinalIgnoreCase))
            return null;
        var department = User.FindFirst("department")?.Value;
        return string.Equals(department, BadgeReplacement.Department, StringComparison.OrdinalIgnoreCase)
            ? requests.Where(request => request.Department == BadgeReplacement.Department)
            : null;
    }

    private Task<InternalRequestEvent?> FindOperation(int actorId, Guid operationId, CancellationToken cancellationToken) =>
        db.Set<InternalRequestEvent>().AsNoTracking()
            .SingleOrDefaultAsync(item => item.ActorId == actorId && item.OperationId == operationId, cancellationToken);

    private async Task<IActionResult> ReplayCreation(InternalRequestEvent item, CancellationToken cancellationToken)
    {
        if (item.Version != 1) return OperationConflict();
        var owned = db.Set<InternalRequest>().Where(request =>
            request.RequesterId == item.ActorId && request.ServiceCode == BadgeReplacement.Code);
        var request = await ReadRequest(owned, item.InternalRequestId, cancellationToken);
        return request is null ? OperationConflict() : Ok(Detail(request));
    }

    private IActionResult ReplayUpdate(InternalRequest request, InternalRequestEvent item, UpdateInternalRequestDto input, string? reply) =>
        item.InternalRequestId == request.Id && item.Version - 1 == input.Version &&
        item.Status == input.Status && item.DueDate == input.DueDate && item.Reply == reply
            ? Ok(Detail(request))
            : OperationConflict();

    private ConflictObjectResult OperationConflict() =>
        Conflict(new ProblemDetails { Detail = "Este identificador já foi usado em outra operação." });

    private ConflictObjectResult StaleVersion() =>
        Conflict(new ProblemDetails { Detail = "A solicitação foi atualizada. Recarregue os dados antes de salvar." });

    private static async Task<InternalRequestPageDto> ReadPage(
        IQueryable<InternalRequest> query, int page, int perPage, CancellationToken cancellationToken)
    {
        PaginationLimits.Normalize(ref page, ref perPage, 50);
        var requests = await query.AsNoTracking().OrderByDescending(item => item.Id)
            .Skip((page - 1) * perPage).Take(perPage + 1).ToListAsync(cancellationToken);
        return new InternalRequestPageDto(requests.Take(perPage).Select(Summary).ToList(), requests.Count > perPage);
    }

    private static Task<InternalRequest?> ReadRequest(IQueryable<InternalRequest> query, int id, CancellationToken cancellationToken) =>
        query.AsNoTracking().Include(request => request.History)
            .SingleOrDefaultAsync(request => request.Id == id, cancellationToken);

    private static InternalRequestSummaryDto Summary(InternalRequest item) => new(
        item.Id, $"SOL-{item.Id.ToString("D6", CultureInfo.InvariantCulture)}", item.ServiceName, item.Department,
        item.RequesterName, item.Status, item.DueDate, item.CreatedAt, item.Version);

    private static InternalRequestDetailDto Detail(InternalRequest item) => new(Summary(item), item.History
        .OrderBy(history => history.Version)
        .Select(history => new InternalRequestEventDto(history.Version, history.ActorName, history.Status,
            history.DueDate, history.Reply, history.CreatedAt)).ToList());
}
