using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using PortalSantaCasa.Server.Controllers;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Security;
using PortalSantaCasa.Server.Services;
using System.Security.Claims;
using System.Reflection;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class ControllerSecurityTests
{
    [Fact]
    public void EveryWriteEndpointRequiresAuthenticationExceptExplicitPublicCollectionRoutes()
    {
        var allowedAnonymous = new HashSet<string> { "AuthController.Login", "PointsController.Register", "PublicAccessLogController.Create" };
        var controllers = typeof(AuthController).Assembly.GetTypes().Where(type => typeof(ControllerBase).IsAssignableFrom(type) && !type.IsAbstract);
        foreach (var controller in controllers)
        foreach (var action in controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
        {
            if (!action.GetCustomAttributes<Microsoft.AspNetCore.Mvc.Routing.HttpMethodAttribute>()
                .SelectMany(attribute => attribute.HttpMethods).Any(method => method is "POST" or "PUT" or "PATCH" or "DELETE")) continue;
            var name = controller.Name + "." + action.Name;
            var anonymous = action.IsDefined(typeof(AllowAnonymousAttribute)) || controller.IsDefined(typeof(AllowAnonymousAttribute));
            var authorized = action.IsDefined(typeof(AuthorizeAttribute)) || controller.IsDefined(typeof(AuthorizeAttribute));
            Assert.True(allowedAnonymous.Contains(name) ? anonymous : authorized && !anonymous, $"Unexpected write access: {name}");
        }
    }

    private static ControllerContext Caller(int id, string role) => new() {
        HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
            new Claim("id", id.ToString()), new Claim("role", role)
        }, "test", "username", "role")) }
    };

    [Fact]
    public async Task CourseWatchUsesAuthenticatedUserInsteadOfUserIdInBody()
    {
        using var db = TestSupport.Database();
        db.UserCourses.AddRange(new UserCourse { CourseId = 1, UserId = 1 }, new UserCourse { CourseId = 1, UserId = 2 });
        await db.SaveChangesAsync();
        var controller = new CoursesController(new CourseService(db, TestSupport.Configuration())) { ControllerContext = Caller(1, "viewer") };
        Assert.IsType<NoContentResult>(await controller.MarkAsWatched(new MarkAsWatchedDto { CourseId = 1, UserId = 2 }));
        Assert.True(db.UserCourses.Find(1, 1)!.IsWatched); Assert.False(db.UserCourses.Find(2, 1)!.IsWatched);
        Assert.IsType<ForbidResult>(await controller.GetAssignedCourses(2));
        Assert.IsType<ForbidResult>(await controller.GetCoursesCreatedByUser(2));
    }

    [Theory]
    [InlineData("reset")]
    [InlineData("change")]
    [InlineData("delete")]
    [InlineData("update")]
    public async Task RegularAdminCannotModifySuperadminAccount(string action)
    {
        using var db = TestSupport.Database(); var user = TestSupport.User(2, "superadmin");
        db.Users.Add(user); await db.SaveChangesAsync(); var hash = user.Senha;
        var controller = new UserController(new UserService(db, new PasswordHasher<object>())) { ControllerContext = Caller(1, "admin") };
        IActionResult result = action switch {
            "reset" => await controller.ResetPassword(2),
            "change" => await controller.ChangePassword(2, new ChangePasswordDto { NewPassword = "Changed123!" }),
            "delete" => await controller.Delete(2),
            _ => await controller.Update(2, new UserUpdateDto { Username = "changed", UserType = "viewer", Department = "RH" })
        };
        Assert.IsType<ForbidResult>(result); Assert.Equal(hash, db.Users.Find(2)!.Senha); Assert.Equal("superadmin", user.UserType);
    }

    [Theory]
    [InlineData("admin", false)]
    [InlineData("superadmin", true)]
    [InlineData("SuperAdmin", true)]
    public async Task SuperadminTransformationGrantsAdminOnce(string role, bool added)
    {
        var principal = Caller(1, role).HttpContext.User;
        var transform = new SuperAdminClaimsTransformation();
        await transform.TransformAsync(principal); await transform.TransformAsync(principal);
        Assert.Equal(added || role == "admin" ? 1 : 0, principal.Claims.Count(x => x.Type == "role" && x.Value == "admin"));
    }

    [Theory]
    [InlineData("News", 500)]
    [InlineData("PublicAccessLog", 10000)]
    public void QueryFilterBoundsActionArgumentsBeforeControllersExecute(string controller, int maximum)
    {
        var route = new RouteData(); route.Values["controller"] = controller;
        var context = new ActionExecutingContext(new ActionContext(new DefaultHttpContext(), route, new ActionDescriptor()),
            [], new Dictionary<string, object?> { ["page"] = int.MaxValue, ["perPage"] = int.MaxValue, ["skip"] = -1, ["take"] = int.MaxValue }, new object());
        new QueryLimitsFilter().OnActionExecuting(context);
        Assert.Equal(maximum, context.ActionArguments["perPage"]); Assert.Equal(0, context.ActionArguments["skip"]); Assert.Equal(100, context.ActionArguments["take"]);
        Assert.InRange(checked(((int)context.ActionArguments["page"]! - 1) * maximum), 0, int.MaxValue);
    }
}
