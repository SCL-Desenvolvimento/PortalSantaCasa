using MassTransit;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Services;
using PortalSantaCasa.Server.Utils;
using Xunit;

namespace PortalSantaCasa.Server.Tests;

public class CourseLifecycleTests
{
    private static readonly DateTimeOffset Today = new(2026, 11, 16, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task EditingScheduleAppliesDeadlineAndPreservesLegacyProgress()
    {
        using var db = TestSupport.Database();
        db.Users.AddRange(TestSupport.User(1), TestSupport.User(2));
        db.Courses.Add(new Course { Id = 1, CreatorId = 1 });
        db.UserCourses.Add(new UserCourse { UserId = 2, CourseId = 1, ProgressPercentage = 45, FirstAccessedAt = Today });
        await db.SaveChangesAsync();
        var courses = new CourseService(db, TestSupport.Configuration());
        var dto = new CourseCreationDto
        {
            Title = "Segurança do paciente", Description = "Treinamento obrigatório",
            TrackName = "  Integração  ", DeadlineDays = 10, ReminderDaysBefore = 2, RenewalDays = 365,
            AssignedUserIds = [2]
        };

        await courses.UpdateAsync(1, dto);
        await courses.UpdateAsync(1, new CourseCreationDto
        {
            Title = dto.Title, Description = dto.Description, AssignedUserIds = [2]
        });

        var course = Assert.Single(await courses.GetAssignedCoursesForUserAsync(2));
        Assert.Equal("Integração", course.TrackName);
        Assert.Equal(45, course.ProgressPercentage);
        Assert.Equal(Today.AddDays(10), course.DueAt);
        Assert.Equal(2, course.ReminderDaysBefore);

        dto.DeadlineDays = 1;
        await Assert.ThrowsAsync<FileUploadValidationException>(() => courses.UpdateAsync(1, dto));
        Assert.Equal(Today.AddDays(10), Assert.Single(await courses.GetCourseTrackingAsync(1)).DueAt);
    }

    [Fact]
    public async Task RenewalKeepsPreviousCompletionAndRejectsOldCycleProgress()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<PortalSantaCasaDbContext>().UseSqlite(connection).Options;
        await using var db = new PortalSantaCasaDbContext(options);
        await db.Database.EnsureCreatedAsync();
        db.Users.AddRange(TestSupport.User(1), TestSupport.User(2));
        db.Courses.Add(new Course { Id = 1, CreatorId = 1, Title = "Integração", DeadlineDays = 7, RenewalDays = 365 });
        var previousCycle = Guid.NewGuid();
        db.UserCourses.Add(new UserCourse
        {
            UserId = 2, CourseId = 1, CycleId = previousCycle, IsWatched = true, ProgressPercentage = 100,
            AssignedAt = Today.AddDays(-370), DueAt = Today.AddDays(-363), WatchedAt = Today.AddDays(-365),
            RenewalAt = Today, TimeSpentSeconds = 500, LastPositionSeconds = 55, CurrentPage = 4
        });
        await db.SaveChangesAsync();
        var job = Lifecycle(db);

        await job.RunAsync(Today);
        await using var reloadedDb = new PortalSantaCasaDbContext(options);
        await Lifecycle(reloadedDb).RunAsync(Today);

        var courses = new CourseService(reloadedDb, TestSupport.Configuration());
        var renewed = Assert.Single(await courses.GetCourseTrackingAsync(1));
        Assert.False(renewed.IsWatched);
        Assert.Equal(0, renewed.ProgressPercentage);
        Assert.Equal(0, renewed.TimeSpentSeconds);
        Assert.Equal(0, renewed.LastPositionSeconds);
        Assert.Equal(0, renewed.CurrentPage);
        Assert.Equal(Today.AddDays(7), renewed.DueAt);
        Assert.Equal(Today.AddDays(-365), Assert.Single(renewed.CompletionHistory).CompletedAt);
        Assert.False(await courses.UpdateProgressAsync(2, new CourseProgressDto { CourseId = 1, CycleId = previousCycle, Completed = true }));
        Assert.False(await courses.UpdateProgressAsync(2, new CourseProgressDto { CourseId = 1, Completed = true }));

        var cycle = await reloadedDb.UserCourses.SingleAsync();
        Assert.NotEqual(previousCycle, cycle.CycleId);
        Assert.True(await courses.UpdateProgressAsync(2, new CourseProgressDto { CourseId = 1, CycleId = cycle.CycleId, Completed = true }));
        var completedAgain = Assert.Single(await courses.GetCourseTrackingAsync(1));
        Assert.True(completedAgain.IsWatched);
        Assert.Equal(completedAgain.WatchedAt?.AddDays(365), completedAgain.RenewalAt);
        Assert.Equal(Today.AddDays(-365), Assert.Single(completedAgain.CompletionHistory).CompletedAt);
    }

    [Theory]
    [InlineData(2, 1)]
    [InlineData(0, 0)]
    public async Task ReminderIsPrivateAndSentOncePerAssignmentAndStage(int daysBefore, int dueInDays)
    {
        using var db = TestSupport.Database();
        db.Users.AddRange(TestSupport.User(1), TestSupport.User(2), TestSupport.User(3), TestSupport.User(4));
        db.Users.Find(4)!.IsActive = false;
        db.Courses.Add(new Course { Id = 1, CreatorId = 1, Title = "Integração", DeadlineDays = 7, ReminderDaysBefore = daysBefore });
        var due = Today.AddDays(dueInDays).AddHours(6);
        db.UserCourses.AddRange(
            new UserCourse { UserId = 2, CourseId = 1, DueAt = due, CycleId = Guid.NewGuid() },
            new UserCourse { UserId = 3, CourseId = 1, DueAt = due, IsWatched = true, WatchedAt = Today },
            new UserCourse { UserId = 4, CourseId = 1, DueAt = due });
        await db.SaveChangesAsync();
        var notifications = new NotificationService(db, TestSupport.Stub<IPublishEndpoint>());
        var job = Lifecycle(db, notifications);

        await job.RunAsync(Today.AddDays(-3));
        Assert.Empty(await notifications.GetUserNotificationsAsync(2));
        await job.RunAsync(Today);
        await job.RunAsync(Today);
        var beforeDue = Assert.Single(await notifications.GetUserNotificationsAsync(2));
        Assert.Equal(due, beforeDue.NotificationDate);
        Assert.Equal("/admin/courses-view?course=1", beforeDue.Link);
        Assert.Empty(await notifications.GetUserNotificationsAsync(1));
        Assert.Empty(await notifications.GetUserNotificationsAsync(3));
        Assert.Empty(await notifications.GetUserNotificationsAsync(4));

        await job.RunAsync(due.AddDays(1));
        await job.RunAsync(due.AddDays(1));
        Assert.Equal(2, (await notifications.GetUserNotificationsAsync(2)).Count());
        Assert.All(await db.Notifications.ToListAsync(), item => Assert.False(item.IsGlobal));
    }

    [Fact]
    public async Task WithdrawingAndReassigningTrainingPreservesProgressAndCompletedCycles()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<PortalSantaCasaDbContext>().UseSqlite(connection).Options;
        await using var db = new PortalSantaCasaDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var creator = TestSupport.User(1);
        creator.Department = "RH";
        db.Users.AddRange(creator, TestSupport.User(2), TestSupport.User(3));
        db.Courses.Add(new Course { Id = 1, CreatorId = 1, TrackName = "Integração", DeadlineDays = 10 });
        var assignment = new UserCourse
        {
            UserId = 2, CourseId = 1, AssignedAt = Today,
            DueAt = Today.AddDays(10), ProgressPercentage = 45,
            Completions = [new CourseCompletion { CycleId = Guid.NewGuid(), CompletedAt = Today.AddYears(-1) }]
        };
        db.UserCourses.Add(assignment);
        await db.SaveChangesAsync();
        var service = new CourseService(db, TestSupport.Configuration());
        var update = new CourseCreationDto
        {
            Title = "Segurança do paciente", Description = "Treinamento obrigatório",
            TrackName = "Integração", DeadlineDays = 10, AssignedUserIds = [3]
        };

        var updated = await service.UpdateAsync(1, update);
        Assert.Equal(new[] { 3 }, updated!.ExplicitAssignedUserIds);

        Assert.False(await service.CanAccessCourseAsync(1, 2, false));
        Assert.False(await service.UpdateProgressAsync(2, new CourseProgressDto { CourseId = 1, Completed = true }));
        Assert.Equal(3, Assert.Single(await service.GetCourseTrackingAsync(1)).UserId);
        Assert.Single(await db.CourseCompletions.ToListAsync());

        update.AssignedDepartments = ["TI"];
        updated = await service.UpdateAsync(1, update);
        Assert.Equal(new[] { 3 }, updated!.ExplicitAssignedUserIds);

        Assert.True(await service.CanAccessCourseAsync(1, 2, false));
        var tracking = await service.GetCourseTrackingAsync(1);
        var resumed = Assert.Single(tracking, item => item.UserId == 2);
        Assert.Equal(45, resumed.ProgressPercentage);
        Assert.Equal(Today.AddYears(-1), Assert.Single(resumed.CompletionHistory).CompletedAt);
        Assert.Single(tracking, item => item.UserId == 3);
    }

    [Fact]
    public async Task DailyEnrollmentAddsNewDepartmentMembersOnlyToNamedTracks()
    {
        using var db = TestSupport.Database();
        var creator = TestSupport.User(1);
        creator.Department = "RH";
        var explicitUser = TestSupport.User(2);
        explicitUser.Department = "Financeiro";
        var inactiveUser = TestSupport.User(4);
        inactiveUser.IsActive = false;
        db.Users.AddRange(creator, explicitUser, TestSupport.User(3), inactiveUser);
        db.Courses.AddRange(
            new Course { Id = 1, CreatorId = 1, TrackName = "Integração", DeadlineDays = 5, AssignedDepartments = "[\"TI\"]" },
            new Course { Id = 2, CreatorId = 1, DeadlineDays = 5, AssignedDepartments = "[\"TI\"]" });
        db.UserCourses.Add(new UserCourse { UserId = 2, CourseId = 1, ProgressPercentage = 30 });
        await db.SaveChangesAsync();
        var job = Lifecycle(db);

        await job.RunAsync(Today);
        await job.RunAsync(Today);

        var assignments = await db.UserCourses.AsNoTracking().OrderBy(x => x.UserId).ToListAsync();
        Assert.Equal(new[] { 2, 3 }, assignments.Select(x => x.UserId));
        Assert.Equal(30, assignments[0].ProgressPercentage);
        Assert.Equal(1, assignments[1].CourseId);
        Assert.Equal(Today.AddDays(5), assignments[1].DueAt);
    }

    private static CourseLifecycleService Lifecycle(PortalSantaCasaDbContext db, NotificationService? notifications = null) =>
        new(db, notifications ?? new NotificationService(db, TestSupport.Stub<IPublishEndpoint>()),
            NullLogger<CourseLifecycleService>.Instance);
}
