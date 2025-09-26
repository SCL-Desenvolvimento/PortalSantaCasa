using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IInstagramService
    {
        Task PublishPostAsync(PostEntity post);
    }
}
