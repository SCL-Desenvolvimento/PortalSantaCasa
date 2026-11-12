using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class StatsService : IStatsService
    {
        private readonly PortalSantaCasaDbContext _context;
        private readonly RhBirthdayDirectory _birthdayDirectory;

        public StatsService(PortalSantaCasaDbContext context, RhBirthdayDirectory birthdayDirectory)
        {
            _context = context;
            _birthdayDirectory = birthdayDirectory;
        }

        public async Task<StatsDto> GetStatsAsync()
        {
            var now = DateTimeOffset.UtcNow;
            var currentPeriodStart = now.AddDays(-30);
            var previousPeriodStart = currentPeriodStart.AddDays(-30);
            var onlineWindowStart = now.AddMinutes(-2);

            var recentFeedbacks = await _context.Feedbacks
                .OrderByDescending(f => f.CreatedAt)
                .Take(5)
                .Select(f => new FeedbackResponseDto
                {
                    Id = f.Id,
                    Name = f.Name,
                    Email = f.Email,
                    Department = f.Department,
                    Category = f.Category,
                    Subject = f.Subject,
                    Message = f.Message,
                    IsRead = f.IsRead,
                    CreatedAt = f.CreatedAt,
                    TargetDepartment = f.TargetDepartment
                }).ToListAsync();

            var onlineUsersCount = await _context.Users
                .CountAsync(u => u.IsActive && u.LastActivityUtc >= onlineWindowStart);
            var activeUsersCount = await _context.Users.CountAsync(u => u.IsActive);

            var newsCount = await _context.News
                .CountAsync(n => n.IsActive && !n.IsQualityMinute);
            var currentNewsCount = await _context.News
                .CountAsync(n => n.IsActive &&
                                 !n.IsQualityMinute &&
                                 n.CreatedAt >= currentPeriodStart &&
                                 n.CreatedAt <= now);
            var previousNewsCount = await _context.News
                .CountAsync(n => n.IsActive &&
                                 !n.IsQualityMinute &&
                                 n.CreatedAt >= previousPeriodStart &&
                                 n.CreatedAt < currentPeriodStart);

            var documentsCount = await _context.Documents.CountAsync(d => d.IsActive);
            var currentDocumentsCount = await _context.Documents
                .CountAsync(d => d.IsActive &&
                                 d.CreatedAt >= currentPeriodStart &&
                                 d.CreatedAt <= now);
            var previousDocumentsCount = await _context.Documents
                .CountAsync(d => d.IsActive &&
                                 d.CreatedAt >= previousPeriodStart &&
                                 d.CreatedAt < currentPeriodStart);

            return new StatsDto
            {
                NewsCount = newsCount,
                DocumentsCount = documentsCount,
                BirthdaysCount = await GetBirthdaysCountAsync(),
                UsersCount = onlineUsersCount,
                NewsTrend = CalculatePercentageChange(currentNewsCount, previousNewsCount),
                DocumentsTrend = CalculatePercentageChange(currentDocumentsCount, previousDocumentsCount),
                UsersTrend = CalculatePercentageShare(onlineUsersCount, activeUsersCount),
                RecentFeedbacks = recentFeedbacks
            };
        }

        private async Task<int?> GetBirthdaysCountAsync()
        {
            try
            {
                return await _birthdayDirectory.CountAsync();
            }
            catch (EmployeeDirectoryUnavailableException)
            {
                return null;
            }
        }

        private static decimal? CalculatePercentageChange(int currentCount, int previousCount)
        {
            if (previousCount == 0)
                return currentCount == 0 ? 0 : null;

            return Math.Round(
                (currentCount - previousCount) * 100m / previousCount,
                1,
                MidpointRounding.AwayFromZero);
        }

        private static decimal CalculatePercentageShare(int partialCount, int totalCount)
        {
            if (totalCount == 0)
                return 0;

            return Math.Round(
                partialCount * 100m / totalCount,
                1,
                MidpointRounding.AwayFromZero);
        }
    }
}
