using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services;

public class BenefitService(PortalSantaCasaDbContext context) : IBenefitService
{
    public async Task<IEnumerable<Benefit>> GetPublicAsync() => await context.Benefits.AsNoTracking()
        .Where(b => b.IsActive).OrderBy(b => b.Category).ThenBy(b => b.Title).ToListAsync();

    public async Task<IEnumerable<Benefit>> GetAdminAsync() => await context.Benefits.AsNoTracking()
        .OrderBy(b => b.Title).ToListAsync();

    public async Task<Benefit> CreateAsync(BenefitDto dto)
    {
        var benefit = new Benefit();
        Apply(benefit, dto);
        context.Benefits.Add(benefit);
        await context.SaveChangesAsync();
        return benefit;
    }

    public async Task<Benefit?> UpdateAsync(int id, BenefitDto dto)
    {
        var benefit = await context.Benefits.FindAsync(id);
        if (benefit is null) return null;
        Apply(benefit, dto);
        await context.SaveChangesAsync();
        return benefit;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var benefit = await context.Benefits.FindAsync(id);
        if (benefit is null) return false;
        context.Benefits.Remove(benefit);
        await context.SaveChangesAsync();
        return true;
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
