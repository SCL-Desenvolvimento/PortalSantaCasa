using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services;

public class CourseLifecycleService(
    PortalSantaCasaDbContext context,
    INotificationService notificationService,
    ILogger<CourseLifecycleService> logger)
{
    public async Task RunAsync(DateTimeOffset now, CancellationToken cancellationToken = default)
    {
        try
        {
            await EnrollTrackMembersAsync(now, cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Uma edição ou outra instância pode ter atribuído o mesmo curso em paralelo.
            context.ChangeTracker.Clear();
            await EnrollTrackMembersAsync(now, cancellationToken);
        }

        var today = CourseService.BusinessDate(now);
        var completed = await context.UserCourses.Include(x => x.Course)
            .Where(x => x.WithdrawnAt == null && x.User.IsActive && x.IsWatched && x.WatchedAt != null && x.RenewalAt != null)
            .ToListAsync(cancellationToken);

        foreach (var assignment in completed.Where(x => CourseService.BusinessDate(x.RenewalAt!.Value) <= today))
            await RenewAsync(assignment, now, cancellationToken);

        var pending = await context.UserCourses.AsNoTracking()
            .Where(x => x.WithdrawnAt == null && x.User.IsActive && !x.IsWatched && x.DueAt != null && x.Course.ReminderDaysBefore != null)
            .Select(x => new
            {
                x.UserId,
                x.CourseId,
                x.CycleId,
                DueAt = x.DueAt!.Value,
                x.Course.Title,
                DaysBefore = x.Course.ReminderDaysBefore!.Value
            })
            .ToListAsync(cancellationToken);

        foreach (var assignment in pending)
        {
            var dueDate = CourseService.BusinessDate(assignment.DueAt);
            if (dueDate.AddDays(-assignment.DaysBefore) > today)
                continue;

            var overdue = dueDate < today;
            var stage = overdue ? "overdue" : "due";
            var key = FormattableString.Invariant(
                $"training:{assignment.CourseId}:{assignment.UserId}:{assignment.CycleId:N}:{assignment.DueAt.UtcTicks}:{stage}");

            try
            {
                await notificationService.CreateTargetedNotificationAsync(new NotificationCreateDto
                {
                    Type = "course",
                    Title = overdue ? "Treinamento em atraso" : "Prazo de treinamento",
                    Message = overdue
                        ? $"{assignment.Title} · Prazo vencido em {dueDate:dd/MM/yyyy}"
                        : $"{assignment.Title} · Concluir até {dueDate:dd/MM/yyyy}",
                    Link = $"/admin/courses-view?course={assignment.CourseId}",
                    NotificationDate = assignment.DueAt
                }, assignment.UserId, key, cancellationToken);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception,
                    "Falha ao enviar lembrete de treinamento do curso {CourseId} para o usuário {UserId}.",
                    assignment.CourseId, assignment.UserId);
            }
        }
    }

    private async Task EnrollTrackMembersAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var courses = await context.Courses
            .Where(course => course.TrackName != null && course.AssignedDepartments != null)
            .ToListAsync(cancellationToken);
        var tracks = courses
            .Select(course => new { Course = course, Departments = CourseService.ParseDepartments(course.AssignedDepartments) })
            .Where(track => track.Departments.Count > 0)
            .ToList();
        if (tracks.Count == 0)
            return;

        var departments = tracks.SelectMany(track => track.Departments).Distinct().ToList();
        var users = await context.Users.AsNoTracking()
            .Where(user => user.IsActive && departments.Contains(user.Department))
            .Select(user => new { user.Id, user.Department })
            .ToListAsync(cancellationToken);
        var usersByDepartment = users.ToLookup(user => user.Department, user => user.Id, StringComparer.OrdinalIgnoreCase);
        var courseIds = tracks.Select(track => track.Course.Id).ToList();
        var assignments = await context.UserCourses
            .Where(assignment => courseIds.Contains(assignment.CourseId))
            .ToListAsync(cancellationToken);
        var assignmentsByCourse = assignments.ToLookup(assignment => assignment.CourseId);

        foreach (var track in tracks)
        {
            var assignmentsByUser = assignmentsByCourse[track.Course.Id].ToDictionary(assignment => assignment.UserId);
            foreach (var userId in track.Departments.SelectMany(department => usersByDepartment[department]).Distinct())
            {
                if (!assignmentsByUser.TryGetValue(userId, out var assignment))
                {
                    context.UserCourses.Add(CourseService.NewAssignment(track.Course, userId, now));
                }
                else if (assignment.WithdrawnAt.HasValue)
                {
                    assignment.WithdrawnAt = null;
                    CourseService.ApplyAssignmentSchedule(assignment, track.Course, now);
                }
            }
        }

        await context.SaveChangesAsync(cancellationToken);
    }

    private async Task RenewAsync(UserCourse assignment, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var completion = new CourseCompletion
        {
            Assignment = assignment,
            CycleId = assignment.CycleId ?? Guid.Empty,
            AssignedAt = assignment.AssignedAt,
            DueAt = assignment.DueAt,
            CompletedAt = assignment.WatchedAt!.Value,
            TimeSpentSeconds = assignment.TimeSpentSeconds
        };
        context.CourseCompletions.Add(completion);
        assignment.CycleId = Guid.NewGuid();
        assignment.AssignedAt = now;
        assignment.IsWatched = false;
        assignment.WatchedAt = null;
        assignment.ProgressPercentage = 0;
        assignment.LastPositionSeconds = 0;
        assignment.TotalDurationSeconds = 0;
        assignment.CurrentPage = 0;
        assignment.TotalPages = 0;
        assignment.TimeSpentSeconds = 0;
        assignment.FirstAccessedAt = null;
        assignment.LastAccessedAt = null;
        CourseService.ApplyAssignmentSchedule(assignment, assignment.Course, now);

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            context.Entry(completion).State = EntityState.Detached;
            context.Entry(assignment).State = EntityState.Detached;
        }
        catch (DbUpdateException)
        {
            context.Entry(completion).State = EntityState.Detached;
            context.Entry(assignment).State = EntityState.Detached;
            if (!await context.CourseCompletions.AnyAsync(x =>
                    x.UserId == completion.UserId && x.CourseId == completion.CourseId && x.CycleId == completion.CycleId,
                    cancellationToken))
                throw;
        }
    }
}
