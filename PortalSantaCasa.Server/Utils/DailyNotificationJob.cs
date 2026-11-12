using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Services;

namespace PortalSantaCasa.Server.Utils
{

    public class DailyNotificationJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;

        // Hora de envio fixo
        private readonly TimeSpan runTime = new TimeSpan(7, 0, 0);

        public DailyNotificationJob(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var brasiliaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("E. South America Standard Time");

            while (!stoppingToken.IsCancellationRequested)
            {
                var now = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, brasiliaTimeZone);

                var nextRun = new DateTime(
                    now.Year,
                    now.Month,
                    now.Day,
                    runTime.Hours,
                    runTime.Minutes,
                    runTime.Seconds
                );

                if (now > nextRun)
                    nextRun = nextRun.AddDays(1);

                var delay = nextRun - now;

                await Task.Delay(delay, stoppingToken);

                // Executa notificações
                await SendDailyNotifications(stoppingToken);
            }
        }

        private async Task SendDailyNotifications(CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<PortalSantaCasaDbContext>();
            var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

            var today = DateTimeOffset.UtcNow.Date;
            var todayDayOfWeek = today.DayOfWeek.ToString().ToLower();

            // 1️⃣ Cardápio do dia
            var menus = await context.Menus
                .Where(m => m.DiaDaSemana.ToLower() == todayDayOfWeek)
                .ToListAsync(stoppingToken);

            foreach (var m in menus)
            {
                bool exists = await context.Notifications.AnyAsync(n =>
                    n.Type == "menu" && n.NotificationDate == today && n.Link == $"/menu/{m.Id}");

                if (!exists)
                {
                    await notificationService.CreateNotificationAsync(new NotificationCreateDto()
                    {
                        Type = "menu",
                        Title = "Cardápio do dia",
                        Message = m.Titulo,
                        Link = $"/menu/{m.Id}",
                        NotificationDate = today
                    });
                }
            }

            // 2️⃣ Eventos próximos (até 3 dias)
            var upcomingEvents = await context.Events
                .Where(e => e.IsActive && e.EventDate.Date >= today && e.EventDate.Date <= today.AddDays(3))
                .ToListAsync(stoppingToken);

            foreach (var e in upcomingEvents)
            {
                bool exists = await context.Notifications.AnyAsync(n =>
                    n.Type == "event" && n.NotificationDate == e.EventDate.Date && n.Link == $"/events/{e.Id}");

                if (!exists)
                {
                    string title = e.EventDate.Date == today ? "Evento hoje" : "Evento próximo";
                    string message = $"{e.Title} em {e.EventDate:dd/MM/yyyy}";

                    await notificationService.CreateNotificationAsync(new NotificationCreateDto()
                    {
                        Type = "event",
                        Title = title,
                        Message = message,
                        Link = $"/events/{e.Id}",
                        NotificationDate = e.EventDate.Date
                    });
                }
            }

            // 3️⃣ Aniversariantes do dia
            var birthdayDate = RhBirthdayDirectory.Today;
            var directory = scope.ServiceProvider.GetRequiredService<RhBirthdayDirectory>();
            IReadOnlyList<UpcomingBirthdayDto> birthdays;
            try
            {
                birthdays = await directory.GetAsync(birthdayDate, 0, stoppingToken);
            }
            catch (EmployeeDirectoryUnavailableException)
            {
                return;
            }

            const string birthdayLink = "/?view=birthdays";
            var notificationDate = new DateTimeOffset(birthdayDate.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
            var notifiedNames = await context.Notifications
                .Where(n => n.Type == "birthday" && n.NotificationDate == notificationDate && n.Link == birthdayLink)
                .Select(n => n.Message)
                .ToListAsync(stoppingToken);
            var notifiedCounts = notifiedNames.CountBy(name => name).ToDictionary();
            foreach (var b in birthdays)
            {
                if (notifiedCounts.TryGetValue(b.Name, out var count) && count > 0)
                {
                    notifiedCounts[b.Name] = count - 1;
                    continue;
                }

                await notificationService.CreateNotificationAsync(new NotificationCreateDto()
                {
                    Type = "birthday",
                    Title = "Aniversariante do dia",
                    Message = b.Name,
                    Link = birthdayLink,
                    NotificationDate = notificationDate
                });
            }
        }


    }
}
