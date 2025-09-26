using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Enums;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class SocialPublisherService : ISocialPublisherService
    {
        private readonly IPostService _postService;
        private readonly IFacebookService _facebookService;
        private readonly IInstagramService _instagramService;
        private readonly ILinkedInService _linkedinService;

        public SocialPublisherService(
            IPostService postRepository,
            IFacebookService facebookService,
            IInstagramService instagramService,
            ILinkedInService linkedinService)
        {
            _postService = postRepository;
            _facebookService = facebookService;
            _instagramService = instagramService;
            _linkedinService = linkedinService;
        }

        public async Task PublishAsync(PostCreateDto postDto)
        {
            // Lógica para publicar imediatamente
            // Criar PostEntity, salvar no banco, chamar serviços específicos
            var postEntity = new PostEntity
            {
                Title = postDto.Title,
                Message = postDto.Message,
                ImageUrl = postDto.Image,
                Providers = [.. postDto.Providers],
                Status = PostStatus.Published,
                CreatedAtUtc = DateTime.UtcNow,
                PublishedAtUtc = DateTime.UtcNow
            };
            await _postService.CreateAsync(postEntity);

            foreach (var provider in postDto.Providers)
            {
                switch (provider.ToLower())
                {
                    case "facebook":
                        await _facebookService.PublishPostAsync(postEntity);
                        break;
                    case "instagram":
                        await _instagramService.PublishPostAsync(postEntity);
                        break;
                    case "linkedin":
                        await _linkedinService.PublishPostAsync(postEntity);
                        break;
                    default:
                        // Log ou erro para provedor não suportado
                        break;
                }
            }
        }

        public async Task ScheduleAsync(PostCreateDto postDto)
        {
            // Lógica para agendar publicação
            var postEntity = new PostEntity
            {
                Title = postDto.Title,
                Message = postDto.Message,
                ImageUrl = postDto.Image,
                Providers = [.. postDto.Providers],
                Status = PostStatus.Scheduled,
                ScheduledAtUtc = postDto.ScheduledAtUtc,
                CreatedAtUtc = DateTime.UtcNow
            };
            await _postService.CreateAsync(postEntity);
            // Aqui você integraria com o Hangfire ou outro agendador
            // Ex: _hangfireScheduler.Schedule(() => PublishScheduledPost(postEntity.Id), postDto.ScheduledAtUtc.Value);
        }

        // Método que seria chamado pelo agendador (Hangfire)
        public async Task PublishScheduledPost(int postId)
        {
            var postEntity = await _postService.GetByIdAsync(postId);
            if (postEntity == null || postEntity.Status != PostStatus.Scheduled)
            {
                return; // Post não encontrado ou não está agendado
            }

            var providers = postEntity.Providers;
            foreach (var provider in providers)
            {
                switch (provider.ToLower())
                {
                    case "facebook":
                        await _facebookService.PublishPostAsync(postEntity);
                        break;
                    case "instagram":
                        await _instagramService.PublishPostAsync(postEntity);
                        break;
                    case "linkedin":
                        await _linkedinService.PublishPostAsync(postEntity);
                        break;
                    default:
                        // Log ou erro para provedor não suportado
                        break;
                }
            }

            postEntity.Status = PostStatus.Published;
            postEntity.PublishedAtUtc = DateTime.UtcNow;
            await _postService.UpdateAsync(postEntity);
        }
    }
}
