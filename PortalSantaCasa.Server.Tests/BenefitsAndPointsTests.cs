using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Services;
using System.ComponentModel.DataAnnotations;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class BenefitsAndPointsTests
{
    [Fact]
    public async Task BenefitsCrudPreservesPublicationAndNormalizesFields()
    {
        using var db = TestSupport.Database(); var service = new BenefitService(db);
        var dto = new BenefitDto { Title = " Benefit ", Description = " Description ", Category = " Health ", Link = " https://example.com ", IsActive = false };
        var created = await service.CreateAsync(dto);
        Assert.Equal("Benefit", created.Title); Assert.Equal("https://example.com", created.Link);
        Assert.Empty(await service.GetPublicAsync()); Assert.Single(await service.GetAdminAsync());
        dto.IsActive = true; dto.Link = " ";
        Assert.NotNull(await service.UpdateAsync(created.Id, dto));
        Assert.Null((await service.GetPublicAsync()).Single().Link);
        Assert.Null(await service.UpdateAsync(999, dto));
        Assert.True(await service.DeleteAsync(created.Id)); Assert.False(await service.DeleteAsync(created.Id));
        Assert.Empty(await db.Benefits.AsNoTracking().ToListAsync());
    }

    [Theory]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("https://example.com", true)]
    [InlineData("", true)]
    public void BenefitsValidatePublicLinks(string link, bool allowed)
    {
        var dto = new BenefitDto { Title = "Benefit", Description = "Description", Link = link };
        Assert.Equal(allowed, Validator.TryValidateObject(dto, new ValidationContext(dto), [], true));
    }

    [Theory]
    [InlineData("NEWS_VIEW")]
    [InlineData("ANNOUNCEMENT_VIEW")]
    [InlineData("QUALITY_VIEW")]
    public async Task SingleCreditEventsNormalizeIdentityAndRejectDuplicate(string eventType)
    {
        using var db = TestSupport.Database();
        db.PointRules.Add(new PointRule { EventType = eventType, Points = 10, BonusPoints = 5, IsActive = true }); await db.SaveChangesAsync();
        var service = new PointsService(db);
        var dto = new RegisterPointsDto { Name = " Person ", RE = " ab1 ", Sector = " TI ", EventType = " " + eventType.ToLowerInvariant() + " ", ReferenceId = " 15 " };
        var result = await service.RegisterAsync(dto);
        Assert.Equal(15, result.Points); Assert.Equal("AB1", result.RE);
        var error = await Assert.ThrowsAsync<PointsRegistrationException>(() => service.RegisterAsync(dto));
        Assert.True(error.IsConflict);
        var ranking = (await service.GetRankingAsync(10)).Single();
        Assert.Equal(15, ranking.TotalPoints); Assert.Equal(1, ranking.TotalEvents); Assert.Equal("Person", ranking.Name);
        Assert.Single(await service.GetEventsAsync("ab1", eventType.ToLowerInvariant(), "15", 1, 10));
    }

    [Theory]
    [InlineData("name")]
    [InlineData("re")]
    [InlineData("sector")]
    [InlineData("event")]
    [InlineData("reference")]
    public async Task InvalidPointsInputDoesNotCreatePlayerOrEvent(string missing)
    {
        using var db = TestSupport.Database();
        db.PointRules.Add(new PointRule { EventType = "NEWS_VIEW", Points = 10, IsActive = true }); await db.SaveChangesAsync();
        var dto = new RegisterPointsDto { Name = "Person", RE = "1", Sector = "TI", EventType = "NEWS_VIEW", ReferenceId = "1" };
        if (missing == "name") dto.Name = " "; if (missing == "re") dto.RE = " ";
        if (missing == "sector") dto.Sector = " "; if (missing == "event") dto.EventType = " ";
        if (missing == "reference") dto.ReferenceId = " ";
        await Assert.ThrowsAsync<PointsRegistrationException>(() => new PointsService(db).RegisterAsync(dto));
        Assert.Empty(await db.Players.ToListAsync()); Assert.Empty(await db.PointEvents.ToListAsync());
    }

    [Fact]
    public async Task PointsRequireActiveRuleAndNonnegativeRuleUpdate()
    {
        using var db = TestSupport.Database();
        db.PointRules.Add(new PointRule { Id = 1, EventType = "GAME", Difficulty = "hard", Points = 10, IsActive = false }); await db.SaveChangesAsync();
        var service = new PointsService(db);
        await Assert.ThrowsAsync<PointsRegistrationException>(() => service.RegisterAsync(new RegisterPointsDto { Name = "Person", RE = "1", Sector = "TI", EventType = "GAME", Difficulty = "hard" }));
        await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateRuleAsync(1, new UpdatePointRuleDto { Points = -1 }));
        Assert.Null(await service.UpdateRuleAsync(999, new UpdatePointRuleDto()));
        Assert.NotNull(await service.UpdateRuleAsync(1, new UpdatePointRuleDto { Points = 20, IsActive = true }));
        Assert.Equal(20, (await service.RegisterAsync(new RegisterPointsDto { Name = "Person", RE = "1", Sector = "TI", EventType = "game", Difficulty = " HARD " })).Points);
    }
}
