using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Enums;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class PostService : IPostService
    {
        private readonly PortalSantaCasaDbContext _context;

        public PostService(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        public async Task<PostEntity> CreateAsync(PostEntity post)
        {
            _context.Posts.Add(post);
            await _context.SaveChangesAsync();
            return post;
        }

        public async Task<PostEntity?> GetByIdAsync(int id)
        {
            return await _context.Posts
                .Include(p => p.PublishLogs)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<IEnumerable<PostEntity>> GetScheduledPostsAsync()
        {
            return await _context.Posts
                .Where(p => p.Status == PostStatus.Scheduled && p.ScheduledAtUtc <= DateTime.UtcNow)
                .ToListAsync();
        }

        public async Task<IEnumerable<PostEntity>> GetPostsByStatusAsync(PostStatus status)
        {
            return await _context.Posts
                .Where(p => p.Status == status)
                .ToListAsync();
        }

        public async Task<IEnumerable<PostEntity>> GetPostsByUserAsync(string userId)
        {
            return await _context.Posts
                .Where(p => p.CreatedByUserId == userId)
                .ToListAsync();
        }

        public async Task<PostEntity> UpdateAsync(PostEntity post)
        {
            _context.Posts.Update(post);
            await _context.SaveChangesAsync();
            return post;
        }

        public async Task DeleteAsync(int id)
        {
            var post = await _context.Posts.FindAsync(id);
            if (post != null)
            {
                _context.Posts.Remove(post);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<IEnumerable<PostEntity>> GetPostsForRetryAsync()
        {
            return await _context.Posts
                .Where(p => p.Status == PostStatus.Failed && p.RetryCount < 3 && p.LastRetryAtUtc < DateTime.UtcNow.AddMinutes(-5))
                .ToListAsync();
        }

        public async Task AddPublishLogAsync(PostPublishLog log)
        {
            _context.PostPublishLogs.Add(log);
            await _context.SaveChangesAsync();
        }
    }
}
