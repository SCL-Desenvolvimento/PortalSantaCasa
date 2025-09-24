using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Utils
{

    public class DailyNotificationJob : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;

        // Hora de envio fixo
        private readonly TimeSpan runTime = new TimeSpan(7, 0, 0); // 7h da manhã

        public DailyNotificationJob(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                var now = DateTime.UtcNow;
                var nextRun = DateTime.UtcNow.Date + runTime;
                if (now > nextRun) nextRun = nextRun.AddDays(1);

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

            var today = DateTime.UtcNow.Date;
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
                        Link = $"/menu/{m.Id}"
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
            var birthdays = await context.Birthdays
                .Where(b => b.IsActive && b.BirthDate.Month == today.Month && b.BirthDate.Day == today.Day)
                .ToListAsync(stoppingToken);

            foreach (var b in birthdays)
            {
                bool exists = await context.Notifications.AnyAsync(n =>
                    n.Type == "birthday" && n.NotificationDate == today && n.Message == b.Name);

                if (!exists)
                {
                    await notificationService.CreateNotificationAsync(new NotificationCreateDto()
                    {
                        Type = "birthday",
                        Title = "Aniversariante do dia",
                        Message = b.Name,
                        Link = string.Empty,
                        NotificationDate = today
                    });
                }
            }
        }


    }
}
