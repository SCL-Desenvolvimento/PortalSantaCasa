using PortalSantaCasa.Server.DTOs;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface ISocialPublisherService
    {
        Task PublishAsync(PostCreateDto postDto);
        Task ScheduleAsync(PostCreateDto postDto);
    }
}
