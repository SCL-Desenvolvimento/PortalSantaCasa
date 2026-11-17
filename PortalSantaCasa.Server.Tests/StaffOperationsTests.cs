using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.Controllers;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Services;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class StaffOperationsTests
{
    [Fact]
    public async Task DirectorySearchFindsAccentInsensitiveServiceOnlyForStaff()
    {
        await using var db = TestSupport.Database();
        var directory = new DepartmentContactsController(new DepartmentContactService(db));
        SetActor(directory, "editor", "Departamento Pessoal");
        Assert.IsType<CreatedResult>(await directory.Create(new DepartmentContactInput
        {
            Title = "Segunda via de crachá", Department = "Departamento Pessoal", Extension = "1234"
        }, default));

        var search = new PublicSearchService(db, new DocumentService(db, TestSupport.Stub<INotificationService>()), new DepartmentContactService(db));
        Assert.Empty(await search.SearchAsync("cracha segunda", "viewer"));
        var result = Assert.Single(await search.SearchAsync("cracha segunda", "viewer", includeStaffContacts: true));
        Assert.Equal("Segunda via de crachá", result.Title);
        Assert.Contains("1234", result.Description);
    }

    [Fact]
    public async Task DirectoryEditorCannotMoveAnotherDepartmentsContact()
    {
        await using var db = TestSupport.Database();
        var directory = new DepartmentContactsController(new DepartmentContactService(db));
        var entry = new DepartmentContactInput { Title = "Crachá", Department = "Departamento Pessoal", Extension = "1234" };
        SetActor(directory, "editor", "Departamento Pessoal");
        var result = Assert.IsType<CreatedResult>(await directory.Create(entry, default));
        var contact = Assert.IsType<DepartmentContactView>(result.Value);

        SetActor(directory, "editor", "Farmácia");
        entry.Department = "Farmácia";
        Assert.IsType<ForbidResult>(await directory.Update(contact.Id, entry, default));

        SetActor(directory, "editor", "Departamento Pessoal");
        entry.Department = "Departamento Pessoal";
        entry.Revision = contact.Revision;
        Assert.IsType<OkObjectResult>(await directory.Update(contact.Id, entry, default));
        Assert.IsType<ConflictObjectResult>(await directory.Update(contact.Id, entry, default));
    }

    [Fact]
    public async Task ContingencyPreservesUpdatesAndRejectsStaleChanges()
    {
        await using var db = TestSupport.Database();
        var controller = new ContingenciesController(new ContingencyService(db));
        var input = new ContingencyCreateInput
        {
            System = "Impressão de etiquetas", Departments = ["Farmácia"], Extension = "1234",
            NextUpdateAt = DateTimeOffset.UtcNow.AddHours(1), Procedure = "Consultar instrução aprovada no posto.",
            Message = "Impressão indisponível."
        };
        SetActor(controller, "editor", "Farmácia");
        Assert.IsType<ForbidResult>(await controller.Create(input, default));
        SetActor(controller, "editor", "Informática");
        var created = Assert.IsType<CreatedResult>(await controller.Create(input, default));
        var incident = Assert.IsType<ContingencyView>(created.Value);
        var update = new ContingencyUpdateInput { Revision = incident.Revision, Status = "resolved", Message = "Serviço restabelecido." };
        var saved = Assert.IsType<OkObjectResult>(await controller.Update(incident.Id, update, default));
        var resolved = Assert.IsType<ContingencyView>(saved.Value);
        Assert.Equal("resolved", resolved.Status);
        Assert.Null(resolved.NextUpdateAt);
        Assert.Equal(new[] { "Impressão indisponível.", "Serviço restabelecido." }, resolved.Updates.Select(item => item.Message));
        Assert.IsType<ConflictObjectResult>(await controller.Update(incident.Id, update, default));
    }

    private static void SetActor(ControllerBase controller, string role, string department)
    {
        var identity = new ClaimsIdentity(new Claim[]
        {
            new("id", "1"), new("role", role), new("department", department), new("username", "Operador")
        }, "test", "username", "role");
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new(identity) } };
    }
}
