using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface ILinkedInService
    {
        Task PublishPostAsync(PostEntity post);
    }
}
