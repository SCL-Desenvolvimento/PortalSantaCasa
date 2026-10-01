using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Security;
using PortalSantaCasa.Server.Services;
using PortalSantaCasa.Server.Utils;
using System.Reflection;
using System.Security.Claims;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class SecurityRegressionTests
{
    private static PortalSantaCasaDbContext Database() => new(new DbContextOptionsBuilder<PortalSantaCasaDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Theory]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("data:text/html,test", false)]
    [InlineData("https://user:password@example.com", false)]
    [InlineData("https://example.com/forms", true)]
    [InlineData("http://intranet/forms", true)]
    public void FormLinksAllowOnlyHttpWithoutCredentials(string value, bool allowed) =>
        Assert.Equal(allowed, new HttpUrlAttribute().IsValid(value));

    [Theory]
    [InlineData("Uploads/Documentos/report.pdf", true)]
    [InlineData("Uploads/Documentos/../Usuarios/report.pdf", false)]
    [InlineData("Uploads/Documentos-other/report.pdf", false)]
    [InlineData("Uploads/Documentos", false)]
    public void StorageConfinesReadsAndDeletesToExpectedDirectory(string path, bool allowed) =>
        Assert.Equal(allowed, UploadStorage.TryResolve(path, "Documentos", out _));

    [Fact]
    public void PaginationCannotOverflowOrRequestUnboundedRows()
    {
        int page = int.MaxValue, size = int.MaxValue;
        PaginationLimits.Normalize(ref page, ref size);
        Assert.Equal(500, size);
        Assert.InRange(checked((page - 1) * size), 0, int.MaxValue);
        page = -1; size = -1;
        PaginationLimits.Normalize(ref page, ref size);
        Assert.Equal(1, page);
        Assert.Equal(1, size);
    }

    [Theory]
    [InlineData("password")]
    [InlineData("role")]
    [InlineData("department")]
    [InlineData("inactive")]
    public async Task SessionIsRevokedWhenAccountSecurityChanges(string change)
    {
        using var db = Database();
        var user = new User { Id = 1, Username = "tester", Senha = "hash", UserType = "viewer",
            Department = "TI", PhotoUrl = "default", IsActive = true };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] {
            new Claim("id", "1"), new Claim("session_version", SessionVersion.For(user)) }, "test"));
        var service = new AuthService(db, new ConfigurationBuilder().Build(), new PasswordHasher<object>());
        Assert.True(await service.IsSessionValidAsync(principal));
        if (change == "password") user.Senha = "new-hash";
        if (change == "role") user.UserType = "admin";
        if (change == "department") user.Department = "RH";
        if (change == "inactive") user.IsActive = false;
        await db.SaveChangesAsync();
        Assert.False(await service.IsSessionValidAsync(principal));
    }

    [Fact]
    public async Task FeedbackIsIsolatedAndDeletionPersistsWithoutNotifications()
    {
        using var db = Database();
        db.Feedbacks.Add(new Feedback { Id = 1, Name = "test", Category = "test", Subject = "test",
            Message = "test", TargetDepartment = "TI" });
        await db.SaveChangesAsync();
        var service = new FeedbackService(db, DispatchProxy.Create<INotificationService, NotificationStub>());
        Assert.Empty(await service.GetAllAsync(""));
        Assert.Empty(await service.GetAllAsync("RH"));
        Assert.Single(await service.GetAllAsync("TI"));
        Assert.False(await service.DeleteAsync(1, "RH"));
        Assert.True(await service.DeleteAsync(1, "TI"));
        Assert.Empty(await db.Feedbacks.AsNoTracking().ToListAsync());
    }

    [Fact]
    public void DisguisedAndTruncatedPngUploadsAreRejected()
    {
        foreach (var bytes in new[] { System.Text.Encoding.UTF8.GetBytes("<html>payload</html>"),
            new byte[] { 0x89, 0x50, 0x4E, 0x47 } })
        {
            using var stream = new MemoryStream(bytes);
            var file = new FormFile(stream, 0, bytes.Length, "file", "image.png") {
                Headers = new HeaderDictionary(), ContentType = "image/png" };
            Assert.Throws<FileUploadValidationException>(() => FileUploadValidator.EnsureImage(file));
        }
    }
}

public class NotificationStub : DispatchProxy
{
    protected override object? Invoke(MethodInfo? method, object?[]? args) =>
        method?.Name == "DeleteBySourceAsync" ? Task.CompletedTask : throw new NotSupportedException();
}
