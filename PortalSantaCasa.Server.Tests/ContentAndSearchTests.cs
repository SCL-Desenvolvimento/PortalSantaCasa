using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Services;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class ContentAndSearchTests
{
    [Fact]
    public async Task NewsOwnerCannotUpdateOrDeleteAnotherAuthorsNews()
    {
        using var db = TestSupport.Database(); db.Users.AddRange(TestSupport.User(1), TestSupport.User(2));
        db.News.Add(new News { Id = 1, Title = "original", UserId = 1, IsActive = true }); await db.SaveChangesAsync();
        var service = new NewsService(db, TestSupport.Stub<INotificationService>());
        Assert.False(await service.UpdateAsync(1, new NewsUpdateDto { Title = "forbidden", UserId = 2 }, 2));
        Assert.False(await service.DeleteAsync(1, 2)); Assert.Empty(await service.GetAllAsync(2));
        Assert.True(await service.UpdateAsync(1, new NewsUpdateDto { Title = "updated", UserId = 1, IsActive = true }, 1));
        Assert.Equal("updated", (await service.GetByIdAsync(1))!.Title);
        Assert.True(await service.DeleteAsync(1, 1)); Assert.Empty(await db.News.ToListAsync());
    }

    [Theory]
    [InlineData("active", 1)]
    [InlineData("inactive", 1)]
    [InlineData("all", 2)]
    public async Task NewsPaginationAndCountsRespectPublicationStatus(string status, int expected)
    {
        using var db = TestSupport.Database(); db.Users.Add(TestSupport.User());
        db.News.AddRange(new News { Id = 1, Title = "published", UserId = 1, IsActive = true },
            new News { Id = 2, Title = "draft", UserId = 1 }, new News { Id = 3, Title = "quality", UserId = 1, IsActive = true, IsQualityMinute = true });
        await db.SaveChangesAsync(); var service = new NewsService(db, TestSupport.Stub<INotificationService>());
        Assert.Equal(expected, await service.GetTotalCountAsync(false, status));
        Assert.Equal(expected, (await service.GetAllPaginatedAsync(1, 10, false, status)).Count());
        Assert.Empty(await service.SearchAsync("draft")); Assert.Single(await service.SearchAsync("draft", activeOnly: false));
    }

    [Fact]
    public async Task EventsRespectOwnerAndPersistDeletionWithoutNotifications()
    {
        using var db = TestSupport.Database(); db.Users.Add(TestSupport.User());
        db.Events.Add(new Event { Id = 1, Title = "event", Description = "test", Location = "test", UserId = 1, IsActive = true, EventDate = DateTime.UtcNow.AddDays(1) });
        await db.SaveChangesAsync(); var service = new EventService(db, TestSupport.Stub<INotificationService>());
        Assert.Null(await service.GetByIdAsync(1, 2)); Assert.False(await service.DeleteAsync(1, 2));
        Assert.False(await service.UpdateAsync(1, new EventUpdateDto { Title = "forbidden" }, 2));
        Assert.Single(await service.GetNextEvents());
        Assert.True(await service.UpdateAsync(1, new EventUpdateDto { Title = "changed", Description = "test", Location = "test", UserId = 1, IsActive = true }, 1));
        Assert.Equal("changed", (await service.GetByIdAsync(1, 1))!.Title);
        Assert.True(await service.DeleteAsync(1, 1)); Assert.Empty(await db.Events.ToListAsync());
    }

    [Fact]
    public async Task AnnouncementsRespectOwnerAndPersistDeletionWithoutNotifications()
    {
        using var db = TestSupport.Database(); db.Users.Add(TestSupport.User());
        db.InternalAnnouncements.Add(new InternalAnnouncement { Id = 1, Title = "test", Content = "test", UserId = 1 }); await db.SaveChangesAsync();
        var service = new InternalAnnouncementService(db);
        Assert.Null(await service.UpdateAsync(1, new InternalAnnouncementUpdateDto { Title = "forbidden" }, 2));
        Assert.False(await service.DeleteAsync(1, 2));
        Assert.NotNull(await service.UpdateAsync(1, new InternalAnnouncementUpdateDto { Title = "updated", Content = "test", UserId = 1, IsActive = true }, 1));
        Assert.Equal("updated", (await service.GetByIdAsync(1))!.Title);
        Assert.True(await service.DeleteAsync(1, 1)); Assert.Empty(await db.InternalAnnouncements.ToListAsync());
    }

    [Fact]
    public async Task BirthdaysCrudHandlesMissingIdsAndPersistsDeletionWithoutNotifications()
    {
        using var db = TestSupport.Database(); var service = new BirthdayService(db, TestSupport.Stub<INotificationService>());
        var created = await service.CreateAsync(new BirthdayCreateDto { Name = "Person", BirthDate = new DateOnly(1990, 5, 1), IsActive = true });
        Assert.Equal(1, await service.GetTotalCountAsync()); Assert.Single(await service.GetAllPaginatedAsync(1, 10));
        Assert.True(await service.UpdateAsync(created.Id, new BirthdayUpdateDto { Name = "Updated", BirthDate = new DateOnly(1990, 5, 1), IsActive = true }));
        Assert.Equal("Updated", (await service.GetByIdAsync(created.Id))!.Name);
        Assert.False(await service.UpdateAsync(999, new BirthdayUpdateDto()));
        Assert.True(await service.DeleteAsync(created.Id)); Assert.False(await service.DeleteAsync(created.Id));
        Assert.Empty(await db.Birthdays.ToListAsync());
    }

    [Fact]
    public async Task MenusCrudPersistsDeletionWithoutNotifications()
    {
        using var db = TestSupport.Database(); var service = new MenuService(db, TestSupport.Stub<INotificationService>());
        var created = new Menu { Id = 1, DiaDaSemana = "Segunda-feira", Titulo = "Lunch", Descricao = "test", ImagemUrl = "Uploads/Cardapio/nonexistent.png" };
        db.Menus.Add(created); await db.SaveChangesAsync();
        Assert.Single(await service.GetAllAsync());
        Assert.True(await service.UpdateAsync(created.Id, new MenuUpdateDto { DiaDaSemana = "Segunda-feira", Titulo = "Updated", Descricao = "test" }));
        Assert.Equal("Updated", (await service.GetByIdAsync(created.Id))!.Titulo);
        Assert.True(await service.DeleteAsync(created.Id)); Assert.False(await service.DeleteAsync(created.Id)); Assert.Empty(await db.Menus.ToListAsync());
    }

    [Fact]
    public async Task BannersPublicListExcludesInactiveAndOrdersPublishedItems()
    {
        using var db = TestSupport.Database();
        db.Banners.AddRange(new Banner { Id = 1, Title = "hidden", Description = "test", ImageUrl = "test", IsActive = false },
            new Banner { Id = 2, Title = "second", Description = "test", ImageUrl = "test", IsActive = true, Order = 2 },
            new Banner { Id = 3, Title = "first", Description = "test", ImageUrl = "test", IsActive = true, Order = 1 });
        await db.SaveChangesAsync(); var service = new BannerService(db);
        Assert.Equal(new[] { 3, 2 }, (await service.GetAllAsync()).Select(x => x.Id));
        Assert.True(await service.DeleteAsync(2)); Assert.False(await service.DeleteAsync(999));
    }

    [Fact]
    public async Task PublicSearchExcludesDraftExpiredAndUnauthorizedContent()
    {
        using var db = TestSupport.Database(); db.Users.Add(TestSupport.User());
        db.News.AddRange(new News { Id = 1, Title = "Search published", Content = "<b>Search text</b>", UserId = 1, IsActive = true },
            new News { Id = 2, Title = "Search draft", UserId = 1 });
        db.InternalAnnouncements.AddRange(new InternalAnnouncement { Id = 1, Title = "Search future", Content = "test", UserId = 1, PublishDate = DateTimeOffset.UtcNow.AddDays(1) },
            new InternalAnnouncement { Id = 2, Title = "Search expired", Content = "test", UserId = 1, ExpirationDate = DateTimeOffset.UtcNow.AddDays(-1) });
        db.Documents.Add(new Document { Id = 1, Name = "Search private", FileName = "private.pdf", FileUrl = "Uploads/Documentos/private.pdf", AccessRoles = "editor", IsActive = true });
        await db.SaveChangesAsync(); var service = new PublicSearchService(db, new DocumentService(db, TestSupport.Stub<INotificationService>()));
        Assert.Empty(await service.SearchAsync("S", "viewer"));
        var results = await service.SearchAsync("Search", "viewer");
        Assert.Single(results); Assert.Equal("news-1", results.Single().Id); Assert.DoesNotContain("<b>", results.Single().Description);
    }

    [Fact]
    public async Task DashboardStatsExcludeDraftAndQualityNewsAndHandleEmptyPeriods()
    {
        using var db = TestSupport.Database(); var service = new StatsService(db);
        var empty = await service.GetStatsAsync(); Assert.Equal(0, empty.NewsCount); Assert.Equal(0m, empty.UsersTrend);
        db.Users.Add(TestSupport.User()); db.News.AddRange(new News { Title = "published", UserId = 1, IsActive = true, CreatedAt = DateTimeOffset.UtcNow },
            new News { Title = "draft", UserId = 1 }, new News { Title = "quality", UserId = 1, IsActive = true, IsQualityMinute = true });
        await db.SaveChangesAsync(); var result = await service.GetStatsAsync(); Assert.Equal(1, result.NewsCount); Assert.Null(result.NewsTrend);
    }
}
