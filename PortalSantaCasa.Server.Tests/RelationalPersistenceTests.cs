using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Services;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class RelationalPersistenceTests
{
    [Fact]
    public async Task NativeSqliteVersionIncludesSecurityFixes()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT sqlite_version()";
        var version = Version.Parse((string)(await command.ExecuteScalarAsync())!);
        Assert.True(version >= new Version(3, 50, 2), $"Outdated native SQLite: {version}");
    }

    [Fact]
    public async Task BenefitsChangesPersistAcrossContextsAndPublicQueryExcludesDrafts()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:"); await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<PortalSantaCasaDbContext>().UseSqlite(connection).Options;
        int id;
        await using (var db = new PortalSantaCasaDbContext(options))
        {
            await db.Database.EnsureCreatedAsync();
            id = (await new BenefitService(db).CreateAsync(new BenefitDto { Title = "benefit", Description = "test", IsActive = false })).Id;
        }
        await using (var db = new PortalSantaCasaDbContext(options))
        {
            var service = new BenefitService(db); Assert.Empty(await service.GetPublicAsync());
            await service.UpdateAsync(id, new BenefitDto { Title = "published", Description = "test", IsActive = true });
        }
        await using (var db = new PortalSantaCasaDbContext(options))
        {
            var service = new BenefitService(db); Assert.Equal("published", (await service.GetPublicAsync()).Single().Title);
            Assert.True(await service.DeleteAsync(id));
        }
        await using (var db = new PortalSantaCasaDbContext(options)) Assert.Empty(await db.Benefits.ToListAsync());
    }

    [Fact]
    public async Task DatabaseEnforcesUniqueUsernameAndAssignmentForeignKeys()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:"); await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<PortalSantaCasaDbContext>().UseSqlite(connection).Options;
        await using var db = new PortalSantaCasaDbContext(options); await db.Database.EnsureCreatedAsync();
        db.Users.Add(TestSupport.User()); await db.SaveChangesAsync();
        var duplicate = TestSupport.User(2); duplicate.Username = "user1"; db.Users.Add(duplicate);
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
        db.Entry(duplicate).State = EntityState.Detached;
        db.UserCourses.Add(new UserCourse { UserId = 1, CourseId = 999 });
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task FolderDeletionPersistsWithoutRelatedNotifications()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:"); await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<PortalSantaCasaDbContext>().UseSqlite(connection).Options;
        await using (var db = new PortalSantaCasaDbContext(options))
        {
            await db.Database.EnsureCreatedAsync(); db.Documents.Add(new Document { Id = 1, Name = "test", IsActive = true });
            await db.SaveChangesAsync();
            Assert.True(await new DocumentService(db, TestSupport.Stub<INotificationService>()).DeleteAsync(1));
        }
        await using (var db = new PortalSantaCasaDbContext(options)) Assert.Empty(await db.Documents.ToListAsync());
    }
}
