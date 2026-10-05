using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.Controllers;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Services;
using System.Security.Claims;
using System.Text.Json;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class ContentVisibilityTests
{
    [Theory]
    [InlineData("superadmin", 2)]
    [InlineData("SuperAdmin", 2)]
    [InlineData("admin", 1)]
    [InlineData("editor", 1)]
    public async Task ManagementContentIncludesOtherAuthorsOnlyForSuperAdmin(string role, int expected)
    {
        using var db = TestSupport.Database();
        var author = TestSupport.User(2);
        author.Department = "Enfermagem";
        db.Users.AddRange(TestSupport.User(1, role), author);
        foreach (var userId in new[] { 1, 2 })
        {
            db.News.Add(new News { Id = userId, UserId = userId, Title = "Notícia" });
            db.News.Add(new News { Id = userId + 2, UserId = userId, Title = "Qualidade", IsQualityMinute = true });
            db.InternalAnnouncements.Add(new InternalAnnouncement { Id = userId, UserId = userId, Title = "Comunicado", IsActive = false });
            db.Events.Add(new Event { Id = userId, UserId = userId, Title = "Evento", Description = "Teste", Location = "Local" });
        }
        await db.SaveChangesAsync();
        var context = new ControllerContext { HttpContext = new DefaultHttpContext {
            User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
                new Claim("id", "1"), new Claim("role", role)
            }, "test", "username", "role"))
        }};
        var news = new NewsController(new NewsService(db, TestSupport.Stub<INotificationService>())) { ControllerContext = context };
        var announcements = new InternalAnnouncementController(new InternalAnnouncementService(db)) { ControllerContext = context };
        var events = new EventController(new EventService(db, TestSupport.Stub<INotificationService>())) { ControllerContext = context };

        Assert.Equal(expected * 2, Assert.IsAssignableFrom<IEnumerable<NewsResponseDto>>(Assert.IsType<OkObjectResult>(await news.GetAll()).Value).Count());
        Assert.Equal(expected, Assert.IsAssignableFrom<IEnumerable<InternalAnnouncementResponseDto>>(Assert.IsType<OkObjectResult>(await announcements.GetAll()).Value).Count());
        Assert.Equal(expected, Assert.IsAssignableFrom<IEnumerable<EventResponseDto>>(Assert.IsType<OkObjectResult>(await events.GetAll()).Value).Count());
        foreach (var quality in new[] { false, true })
        {
            var page = JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(await news.GetManagementPaginated(1, 1, quality)).Value);
            Assert.Equal(expected, page.GetProperty("pages").GetInt32());
            Assert.Equal(1, page.GetProperty("news").GetArrayLength());
        }
        var announcementPage = JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(await announcements.GetManagementPaginated(1, 1)).Value);
        Assert.Equal(expected, announcementPage.GetProperty("totalCount").GetInt32());
        var eventPage = JsonSerializer.SerializeToElement(Assert.IsType<OkObjectResult>(await events.GetAllPaginated(1, 1)).Value);
        Assert.Equal(expected, eventPage.GetProperty("pages").GetInt32());

        var details = new[] { await news.GetManagementById(2), await news.GetManagementById(4), await announcements.GetManagementById(2), await events.GetById(2) };
        foreach (var detail in details)
        {
            if (expected == 2) Assert.IsType<OkObjectResult>(detail);
            else Assert.IsType<NotFoundResult>(detail);
        }
    }
}
