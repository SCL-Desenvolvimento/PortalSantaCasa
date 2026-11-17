using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Controllers;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class InternalRequestsTests
{
    private const string Department = "Departamento Pessoal";
    private const string Service = "segunda-via-cracha";

    [Fact]
    public async Task IntakeRetryReturnsOneProtocolAndOneOpeningEvent()
    {
        await using var connection = await OpenDatabase();
        await using var db = Database(connection);
        var request = new CreateInternalRequestDto(Service, Guid.NewGuid());

        var created = await OpenRequest(Caller(db, 1), request);
        var replay = Assert.IsType<InternalRequestDetailDto>(
            Assert.IsType<OkObjectResult>(await Caller(db, 1).Create(request, default)).Value);

        Assert.Equal(created.Request.Protocol, replay.Request.Protocol);
        Assert.Matches(@"^SOL-\d{6,}$", created.Request.Protocol);
        var history = Assert.Single(replay.History);
        Assert.Equal("recebida", history.Status);
        Assert.Equal("user1", history.ActorName);
        Assert.Equal(1, await db.Set<InternalRequest>().CountAsync());
        Assert.Equal(1, await db.Set<InternalRequestEvent>().CountAsync());
    }

    [Fact]
    public async Task SimultaneousIntakeRetriesReturnTheSameProtocol()
    {
        await using var connection = await OpenDatabase();
        var input = new CreateInternalRequestDto(Service, Guid.NewGuid());
        await using var winnerDb = Database(connection);
        InternalRequestDetailDto? winner = null;
        await using var retryDb = Database(connection, new BeforeSave(async () =>
            winner = await OpenRequest(Caller(winnerDb, 1), input)));

        var retry = Assert.IsType<OkObjectResult>(await Caller(retryDb, 1).Create(input, default));

        Assert.Equal(winner?.Request.Protocol, Assert.IsType<InternalRequestDetailDto>(retry.Value).Request.Protocol);
        Assert.Equal(1, await retryDb.Set<InternalRequest>().CountAsync());
        Assert.Equal(1, await retryDb.Set<InternalRequestEvent>().CountAsync());
    }

    [Fact]
    public async Task ViewersSeeOnlyTheirOwnRequestsAndCannotTriage()
    {
        await using var connection = await OpenDatabase();
        await using var db = Database(connection);
        var own = await OpenRequest(Caller(db, 1));
        var other = await OpenRequest(Caller(db, 2));

        var result = Assert.IsType<OkObjectResult>(await Caller(db, 1).GetMine(1, 15, default));
        Assert.Equal(own.Request.Id, Assert.Single(Assert.IsType<InternalRequestPageDto>(result.Value).Items).Id);
        Assert.IsType<NotFoundResult>(await Caller(db, 1).GetById(other.Request.Id, default));
        Assert.IsType<ForbidResult>(await Caller(db, 1, Department).GetQueue(1, 15, default));
        Assert.IsType<ForbidResult>(await Caller(db, 1, Department).Update(own.Request.Id,
            new UpdateInternalRequestDto(1, Guid.NewGuid(), "em-andamento", null, null), default));
    }

    [Theory]
    [InlineData("editor", "Departamento Pessoal", true)]
    [InlineData("Admin", "Departamento Pessoal", true)]
    [InlineData("editor", "Recursos Humanos (RH)", false)]
    [InlineData("admin", "Informática", false)]
    [InlineData("admin", "", false)]
    [InlineData("superadmin", "Informática", true)]
    public async Task QueueAndRequestDetailsRespectDepartmentScope(string role, string department, bool canManage)
    {
        await using var connection = await OpenDatabase();
        await using var db = Database(connection);
        var own = await OpenRequest(Caller(db, 1));
        var handler = Caller(db, 2, department, role);

        var catalog = Assert.IsType<InternalRequestCatalogDto>(Assert.IsType<OkObjectResult>(handler.GetCatalog()).Value);
        Assert.Equal(canManage, catalog.CanManage);
        var result = await handler.GetQueue(1, 15, default);
        var detail = await handler.GetById(own.Request.Id, default);

        if (canManage)
        {
            var queue = Assert.IsType<InternalRequestPageDto>(Assert.IsType<OkObjectResult>(result).Value);
            Assert.Equal(own.Request.Id, Assert.Single(queue.Items).Id);
            Assert.IsType<OkObjectResult>(detail);
        }
        else
        {
            Assert.IsType<ForbidResult>(result);
            Assert.IsType<NotFoundResult>(detail);
        }
    }

    [Fact]
    public async Task TriagePersistsDeadlineAndReturnWithoutDuplicatingHistoryOrOverwritingNewerChanges()
    {
        await using var connection = await OpenDatabase();
        await using var db = Database(connection);
        var request = await OpenRequest(Caller(db, 1));
        var id = request.Request.Id;
        var deadline = new DateOnly(2026, 12, 7);
        var start = new UpdateInternalRequestDto(1, Guid.NewGuid(), "em-andamento", deadline, null);
        var complete = new UpdateInternalRequestDto(2, Guid.NewGuid(), "concluida", deadline, "Retire seu crachá no setor.");

        await using (var triage = Database(connection))
        {
            var handler = Caller(triage, 2, Department, "editor");
            Assert.IsType<OkObjectResult>(await handler.Update(id, start, default));
            Assert.IsType<OkObjectResult>(await handler.Update(id, complete, default));
            Assert.IsType<OkObjectResult>(await handler.Update(id, start, default));
            Assert.IsType<ConflictObjectResult>(await handler.Update(id, start with { DueDate = null }, default));
            Assert.IsType<ConflictObjectResult>(await handler.Update(id, start with { OperationId = Guid.NewGuid() }, default));
        }

        var detail = Assert.IsType<InternalRequestDetailDto>(
            Assert.IsType<OkObjectResult>(await Caller(db, 1).GetById(id, default)).Value);
        Assert.Equal(3, detail.Request.Version);
        Assert.Equal(deadline, detail.Request.DueDate);
        Assert.Collection(detail.History,
            item => Assert.Equal("recebida", item.Status),
            item => { Assert.Equal("em-andamento", item.Status); Assert.Equal(deadline, item.DueDate); },
            item => { Assert.Equal("Retire seu crachá no setor.", item.Reply); Assert.Equal("user2", item.ActorName); });
    }

    [Fact]
    public async Task CompletionRequiresAReplyAndCannotBeReopened()
    {
        await using var connection = await OpenDatabase();
        await using var db = Database(connection);
        var request = await OpenRequest(Caller(db, 1));
        var handler = Caller(db, 2, Department, "admin");
        var id = request.Request.Id;
        var complete = new UpdateInternalRequestDto(1, Guid.NewGuid(), "concluida", null, "  ");

        Assert.IsType<BadRequestObjectResult>(await handler.Update(id, complete, default));
        Assert.IsType<OkObjectResult>(await handler.Update(id, complete with { Reply = "Disponível para retirada." }, default));
        Assert.IsType<BadRequestObjectResult>(await handler.Update(id,
            new UpdateInternalRequestDto(2, Guid.NewGuid(), "recebida", null, null), default));
    }

    [Fact]
    public async Task ACompetingTriageSaveLeavesOnlyTheWinningEvent()
    {
        await using var connection = await OpenDatabase();
        await using var winnerDb = Database(connection);
        var request = await OpenRequest(Caller(winnerDb, 1));
        var id = request.Request.Id;
        var winner = new UpdateInternalRequestDto(1, Guid.NewGuid(), "em-andamento", new DateOnly(2026, 12, 7), "Em produção.");
        var loser = new UpdateInternalRequestDto(1, Guid.NewGuid(), "concluida", null, "Disponível para retirada.");
        await using var loserDb = Database(connection, new BeforeSave(async () =>
            Assert.IsType<OkObjectResult>(await Caller(winnerDb, 2, Department, "editor").Update(id, winner, default))));

        var result = await Caller(loserDb, 2, Department, "editor").Update(id, loser, default);

        Assert.IsType<ConflictObjectResult>(result);
        var history = await loserDb.Set<InternalRequestEvent>().AsNoTracking().OrderBy(item => item.Version).ToListAsync();
        Assert.Equal(2, history.Count);
        Assert.Equal(winner.OperationId, history[1].OperationId);
        Assert.Equal("em-andamento", (await loserDb.Set<InternalRequest>().SingleAsync()).Status);
    }

    private static async Task<InternalRequestDetailDto> OpenRequest(
        InternalRequestsController controller, CreateInternalRequestDto? request = null) =>
        Assert.IsType<InternalRequestDetailDto>(Assert.IsType<CreatedAtActionResult>(
            await controller.Create(request ?? new CreateInternalRequestDto(Service, Guid.NewGuid()), default)).Value);

    private static InternalRequestsController Caller(PortalSantaCasaDbContext db, int id, string department = "TI", string role = "viewer") =>
        new(db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity([
                        new Claim("id", id.ToString()), new Claim("username", $"user{id}"),
                        new Claim("department", department), new Claim("role", role)
                    ], "test", "username", "role"))
                }
            }
        };

    private static PortalSantaCasaDbContext Database(SqliteConnection connection, params IInterceptor[] interceptors) =>
        new(new DbContextOptionsBuilder<PortalSantaCasaDbContext>().UseSqlite(connection).AddInterceptors(interceptors).Options);

    private static async Task<SqliteConnection> OpenDatabase()
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await using var db = Database(connection);
        await db.Database.EnsureCreatedAsync();
        db.Users.AddRange(TestSupport.User(1), TestSupport.User(2));
        await db.SaveChangesAsync();
        return connection;
    }

    private sealed class BeforeSave(Func<Task> compete) : SaveChangesInterceptor
    {
        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
            DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            await compete();
            return result;
        }
    }
}
