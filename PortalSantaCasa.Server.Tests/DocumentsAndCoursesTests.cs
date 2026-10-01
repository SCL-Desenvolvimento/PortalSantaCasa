using Microsoft.AspNetCore.WebUtilities;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Services;
using PortalSantaCasa.Server.Utils;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class DocumentsAndCoursesTests
{
    [Theory]
    [InlineData("viewer", true, "viewer", true)]
    [InlineData("editor", true, "viewer", false)]
    [InlineData("viewer", false, "viewer", false)]
    [InlineData("editor", true, "admin", true)]
    public async Task DocumentAccessRespectsParentsAndManagerRole(string parentRoles, bool parentActive, string role, bool allowed)
    {
        using var db = TestSupport.Database();
        db.Documents.AddRange(new Document { Id = 1, Name = "folder", AccessRoles = parentRoles, IsActive = parentActive },
            new Document { Id = 2, ParentId = 1, Name = "file", AccessRoles = "viewer,editor", IsActive = true, FileUrl = "Uploads/Documentos/test.pdf" });
        await db.SaveChangesAsync();
        var service = new DocumentService(db, TestSupport.Stub<INotificationService>());
        Assert.Equal(allowed, await service.GetByIdAsync(2, role) != null);
        Assert.Equal(allowed, await service.GetAccessibleFileAsync(2, role) != null);
        Assert.Equal(allowed, (await service.SearchAsync("file", role)).Any());
        if (allowed) Assert.Equal("/api/document/2/content", (await service.GetByIdAsync(2, role))!.FileUrl);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(99)]
    public async Task MovingFolderRejectsSelfDescendantOrMissingParent(int parentId)
    {
        using var db = TestSupport.Database();
        db.Documents.AddRange(new Document { Id = 1, Name = "parent", IsActive = true }, new Document { Id = 2, Name = "child", ParentId = 1, IsActive = true });
        await db.SaveChangesAsync();
        var service = new DocumentService(db, TestSupport.Stub<INotificationService>());
        await Assert.ThrowsAsync<FileUploadValidationException>(() => service.UpdateAsync(1,
            new DocumentUpdateDto { Name = "parent", ParentId = parentId, IsActive = true }, "admin"));
        Assert.Null(db.Documents.Find(1)!.ParentId);
    }

    [Fact]
    public async Task UnauthorizedDocumentUpdateAndInvalidParentDoNotPersistChanges()
    {
        using var db = TestSupport.Database();
        db.Documents.Add(new Document { Id = 1, Name = "private", IsActive = true, AccessRoles = "editor", FileUrl = "Uploads/Documentos/file.pdf" });
        await db.SaveChangesAsync();
        var service = new DocumentService(db, TestSupport.Stub<INotificationService>());
        Assert.False(await service.UpdateAsync(1, new DocumentUpdateDto { Name = "changed" }, "viewer"));
        await Assert.ThrowsAsync<FileUploadValidationException>(() => service.CreateAsync(new DocumentCreateDto { Name = "child", ParentId = 1 }, "admin"));
        Assert.Equal("private", db.Documents.Find(1)!.Name);
    }

    [Theory]
    [InlineData(1, false, true, true)]
    [InlineData(2, false, true, false)]
    [InlineData(3, false, false, false)]
    [InlineData(3, true, true, true)]
    public async Task CoursePermissionsDistinguishCreatorAssigneeAndAdministrator(int userId, bool admin, bool access, bool manage)
    {
        using var db = TestSupport.Database();
        db.Users.AddRange(TestSupport.User(1), TestSupport.User(2), TestSupport.User(3));
        db.Courses.Add(new Course { Id = 1, Title = "test", Description = "test", VideoUrl = "Uploads/Courses/test.pdf", CreatorId = 1 });
        db.UserCourses.Add(new UserCourse { CourseId = 1, UserId = 2 }); await db.SaveChangesAsync();
        var service = new CourseService(db, TestSupport.Configuration());
        Assert.Equal(access, await service.CanAccessCourseAsync(1, userId, admin));
        Assert.Equal(manage, await service.CanManageCourseAsync(1, userId, admin));
        Assert.False(await service.CanAccessCourseAsync(999, userId, admin));
    }

    [Fact]
    public async Task CourseProgressCannotRegressOrAffectAnotherUsersAssignment()
    {
        using var db = TestSupport.Database();
        db.UserCourses.Add(new UserCourse { CourseId = 1, UserId = 2 }); await db.SaveChangesAsync();
        var service = new CourseService(db, TestSupport.Configuration());
        Assert.False(await service.UpdateProgressAsync(3, new CourseProgressDto { CourseId = 1, Completed = true }));
        await service.UpdateProgressAsync(2, new CourseProgressDto { CourseId = 1, ProgressPercentage = 50, ActivitySeconds = 1000, PositionSeconds = -1 });
        await service.UpdateProgressAsync(2, new CourseProgressDto { CourseId = 1, ProgressPercentage = 10, ActivitySeconds = -1 });
        var assignment = db.UserCourses.Find(2, 1)!;
        Assert.Equal(50, assignment.ProgressPercentage); Assert.Equal(60, assignment.TimeSpentSeconds);
        Assert.Equal(0, assignment.LastPositionSeconds); Assert.NotNull(assignment.FirstAccessedAt);
        await service.UpdateProgressAsync(2, new CourseProgressDto { CourseId = 1, ProgressPercentage = 91 });
        Assert.True(assignment.IsWatched); Assert.Equal(100, assignment.ProgressPercentage); Assert.NotNull(assignment.WatchedAt);
    }

    [Theory]
    [InlineData("user")]
    [InlineData("course")]
    [InlineData("expiration")]
    [InlineData("signature")]
    public async Task CourseSignedUrlsRejectTampering(string changed)
    {
        using var db = TestSupport.Database(); var service = new CourseService(db, TestSupport.Configuration());
        Directory.CreateDirectory(Path.Combine("Uploads", "Courses"));
        var path = Path.Combine("Uploads", "Courses", Guid.NewGuid() + ".pdf");
        await File.WriteAllTextAsync(path, "%PDF-1.7");
        try
        {
            db.Users.Add(TestSupport.User(2));
            db.Courses.Add(new Course { Id = 1, Title = "test", Description = "test", VideoUrl = path, CreatorId = 2, OriginalFileName = "test.pdf" });
            await db.SaveChangesAsync();
            var url = service.CreateSignedContentUrl(1, 2);
            var parameters = QueryHelpers.ParseQuery(new Uri("https://example.com" + url).Query);
            var expires = long.Parse(parameters["expires"]!); var signature = parameters["signature"].ToString();
            Assert.NotNull(await service.GetContentAsync(1, 2, expires, signature));
            Assert.Null(await service.GetContentAsync(changed == "course" ? 3 : 1, changed == "user" ? 4 : 2,
                changed == "expiration" ? expires + 1 : expires, changed == "signature" ? "%%%" : signature));
            db.Users.Find(2)!.IsActive = false; await db.SaveChangesAsync();
            Assert.Null(await service.GetContentAsync(1, 2, expires, signature));
        }
        finally { File.Delete(path); }
    }
}
