using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Security;

namespace PortalSantaCasa.Server.Services;

public sealed class DepartmentContactService(PortalSantaCasaDbContext context)
{
    public Task<DepartmentContact?> GetAsync(int id, CancellationToken cancellationToken) =>
        context.Set<DepartmentContact>().SingleOrDefaultAsync(contact => contact.Id == id, cancellationToken);

    public async Task<List<DepartmentContact>> SearchAsync(string? query, int limit, CancellationToken cancellationToken,
        bool allDepartments = false, string? managedDepartment = null)
    {
        var department = managedDepartment == null ? null : DepartmentKey.From(managedDepartment);
        var contacts = context.Set<DepartmentContact>().AsNoTracking().Where(contact =>
            contact.IsActive || allDepartments || (department != null && contact.DepartmentKey == department));
        foreach (var term in Normalize(query ?? string.Empty).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Distinct())
            contacts = contacts.Where(contact => contact.SearchText.Contains(term));

        return await contacts.OrderBy(contact => contact.Department).ThenBy(contact => contact.Title).ThenBy(contact => contact.Id)
            .Take(limit).ToListAsync(cancellationToken);
    }

    public async Task<DepartmentContact> SaveAsync(DepartmentContactInput input, DepartmentContact? contact, CancellationToken cancellationToken)
    {
        if (contact == null)
        {
            contact = new DepartmentContact();
            context.Add(contact);
        }

        contact.Title = input.Title.Trim();
        contact.Department = input.Department.Trim();
        contact.DepartmentKey = DepartmentKey.From(contact.Department);
        contact.Extension = input.Extension?.Trim() ?? string.Empty;
        contact.Hours = input.Hours?.Trim() ?? string.Empty;
        contact.Keywords = input.Keywords?.Trim() ?? string.Empty;
        contact.ChannelUrl = input.ChannelUrl?.Trim() ?? string.Empty;
        contact.IsActive = input.IsActive;
        contact.UpdatedAt = DateTimeOffset.UtcNow;
        contact.Revision++;
        contact.SearchText = Normalize($"{contact.Title} {contact.Department} {contact.Extension} {contact.Keywords}");
        await context.SaveChangesAsync(cancellationToken);
        return contact;
    }

    private static string Normalize(string text)
    {
        var result = new StringBuilder(text.Length);
        foreach (var character in text.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                result.Append(char.ToLowerInvariant(character));
        }
        return result.ToString().Normalize(NormalizationForm.FormC);
    }
}
