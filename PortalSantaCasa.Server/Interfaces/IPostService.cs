using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Enums;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IPostService
    {
        Task<PostEntity> CreateAsync(PostEntity post);
        Task<PostEntity?> GetByIdAsync(int id);
        Task<IEnumerable<PostEntity>> GetScheduledPostsAsync();
        Task<IEnumerable<PostEntity>> GetPostsByStatusAsync(PostStatus status);
        Task<IEnumerable<PostEntity>> GetPostsByUserAsync(string userId);
        Task<PostEntity> UpdateAsync(PostEntity post);
        Task DeleteAsync(int id);
        Task<IEnumerable<PostEntity>> GetPostsForRetryAsync();
        Task AddPublishLogAsync(PostPublishLog log);
    }
}
