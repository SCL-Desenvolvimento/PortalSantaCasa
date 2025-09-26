using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Interfaces
{
    public interface IFacebookService
    {
        Task PublishPostAsync(PostEntity post);
    }
}
