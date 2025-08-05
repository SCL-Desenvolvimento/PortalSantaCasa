using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class StatsService : IStatsService
    {
        private readonly PortalSantaCasaDbContext _context;

        public StatsService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task<StatsDto> GetStatsAsync()
        {
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
                    Status = f.Status,
                    CreatedAt = f.CreatedAt
                }).ToListAsync();

            return new StatsDto
            {
                NewsCount = await _context.News.CountAsync(),
                DocumentsCount = await _context.Documents.CountAsync(),
                BirthdaysCount = await _context.Birthdays.CountAsync(),
                UsersCount = await _context.Users.CountAsync(),
                RecentFeedbacks = recentFeedbacks
            };
        }
    }
}
