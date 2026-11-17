using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Services;

public sealed class ContingencyService(PortalSantaCasaDbContext context)
{
    public async Task<IReadOnlyList<ContingencyView>> ListAsync(bool includeResolved, CancellationToken cancellationToken)
    {
        var incidents = await context.Set<Contingency>().AsNoTracking()
            .Where(item => includeResolved || item.Status != "resolved")
            .OrderBy(item => item.Status == "resolved").ThenByDescending(item => item.Id).Take(100)
            .Include(item => item.Updates).ToListAsync(cancellationToken);
        return incidents.Select(View).ToArray();
    }

    public async Task<ContingencyView?> GetAsync(int id, CancellationToken cancellationToken)
    {
        var incident = await FindAsync(id, cancellationToken);
        return incident == null ? null : View(incident);
    }

    public async Task<ContingencyView> CreateAsync(ContingencyCreateInput input, string author, CancellationToken cancellationToken)
    {
        var incident = new Contingency
        {
            System = input.System.Trim(), DepartmentsJson = SerializeDepartments(input.Departments),
            Extension = input.Extension.Trim(), Procedure = input.Procedure.Trim(),
            NextUpdateAt = input.NextUpdateAt?.ToUniversalTime(), CreatedAt = DateTimeOffset.UtcNow
        };
        incident.Updates.Add(NewUpdate(incident.Status, input.Message, author));
        context.Add(incident);
        await context.SaveChangesAsync(cancellationToken);
        return View(incident);
    }

    public async Task<ContingencyView?> UpdateAsync(int id, ContingencyUpdateInput input, string author, CancellationToken cancellationToken)
    {
        var incident = await FindAsync(id, cancellationToken);
        if (incident == null) return null;
        if (incident.Revision != input.Revision || incident.Status == "resolved") throw new DbUpdateConcurrencyException();

        incident.Status = input.Status;
        incident.NextUpdateAt = input.Status == "resolved" ? null : input.NextUpdateAt?.ToUniversalTime();
        if (input.Departments != null) incident.DepartmentsJson = SerializeDepartments(input.Departments);
        if (input.Extension != null) incident.Extension = input.Extension.Trim();
        if (input.Procedure != null) incident.Procedure = input.Procedure.Trim();
        incident.Revision++;
        incident.Updates.Add(NewUpdate(input.Status, input.Message, author));
        await context.SaveChangesAsync(cancellationToken);
        return View(incident);
    }

    private Task<Contingency?> FindAsync(int id, CancellationToken cancellationToken) =>
        context.Set<Contingency>().Include(item => item.Updates).SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

    private static ContingencyUpdate NewUpdate(string status, string message, string author) => new()
    {
        Status = status, Message = message.Trim(), Author = author, CreatedAt = DateTimeOffset.UtcNow
    };

    private static string SerializeDepartments(string[] departments) =>
        JsonSerializer.Serialize(departments.Select(department => department.Trim()).Distinct(StringComparer.OrdinalIgnoreCase));

    private static ContingencyView View(Contingency incident) => new(incident.Id, incident.System,
        JsonSerializer.Deserialize<string[]>(incident.DepartmentsJson) ?? [], incident.Extension, incident.Procedure,
        incident.Status, incident.CreatedAt, incident.NextUpdateAt, incident.Revision,
        incident.Updates.OrderBy(item => item.Id)
            .Select(item => new ContingencyUpdateView(item.Status, item.Message, item.Author, item.CreatedAt)).ToArray());
}
