using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Enums;
using PortalSantaCasa.Server.Interfaces;
using System.Collections.Concurrent;
using Microsoft.Extensions.DependencyInjection; // Adicionar este using

namespace PortalSantaCasa.Server.Services
{
    public class SocialPublisherService : ISocialPublisherService
    {
        private readonly IPostService _postService;
        private readonly IFacebookService _facebookService;
        private readonly IInstagramService _instagramService;
        private readonly ILinkedInService _linkedinService;
        private readonly IServiceScopeFactory _scopeFactory; // Injetar IServiceScopeFactory
        private static ConcurrentDictionary<int, Timer> _scheduledPosts = new ConcurrentDictionary<int, Timer>();

        public SocialPublisherService(
            IPostService postService,
            IFacebookService facebookService,
            IInstagramService instagramService,
            ILinkedInService linkedinService,
            IServiceScopeFactory scopeFactory) // Adicionar IServiceScopeFactory ao construtor
        {
            _postService = postService;
            _facebookService = facebookService;
            _instagramService = instagramService;
            _linkedinService = linkedinService;
            _scopeFactory = scopeFactory;
        }

        public async Task PublishAsync(PostCreateDto postDto)
        {
            var postEntity = new PostEntity
            {
                Title = postDto.Title,
                Message = postDto.Message,
                ImageUrl = postDto.Image,
                Providers = postDto.Providers.ToList(),
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
                        Console.WriteLine($"Provedor não suportado: {provider}");
                        break;
                }
            }
        }

        public async Task ScheduleAsync(PostCreateDto postDto)
        {
            if (!postDto.ScheduledAtUtc.HasValue)
            {
                throw new ArgumentException("ScheduledAtUtc é obrigatório para agendamento.");
            }

            var postEntity = new PostEntity
            {
                Title = postDto.Title,
                Message = postDto.Message,
                ImageUrl = postDto.Image,
                Providers = postDto.Providers.ToList(),
                Status = PostStatus.Scheduled,
                ScheduledAtUtc = postDto.ScheduledAtUtc,
                CreatedAtUtc = DateTime.UtcNow
            };
            await _postService.CreateAsync(postEntity);

            var timeToSchedule = postDto.ScheduledAtUtc.Value - DateTime.UtcNow;
            if (timeToSchedule < TimeSpan.Zero) timeToSchedule = TimeSpan.Zero; 

            var timer = new Timer(async (state) =>
            {
                var postId = (int)state;
                await PublishScheduledPost(postId);
                _scheduledPosts.TryRemove(postId, out _);
            }, postEntity.Id, timeToSchedule, Timeout.InfiniteTimeSpan);

            _scheduledPosts.TryAdd(postEntity.Id, timer);
            Console.WriteLine($"Post {postEntity.Id} agendado para {postDto.ScheduledAtUtc.Value}");
        }

        public async Task PublishScheduledPost(int postId)
        {
            using (var scope = _scopeFactory.CreateScope()) // Usar _scopeFactory para criar o escopo
            {
                var scopedPostService = scope.ServiceProvider.GetRequiredService<IPostService>();
                var scopedFacebookService = scope.ServiceProvider.GetRequiredService<IFacebookService>();
                var scopedInstagramService = scope.ServiceProvider.GetRequiredService<IInstagramService>();
                var scopedLinkedInService = scope.ServiceProvider.GetRequiredService<ILinkedInService>();
                // Não é necessário resolver DbContext diretamente aqui, pois os serviços já o recebem por injeção

                var postEntity = await scopedPostService.GetByIdAsync(postId);
                if (postEntity == null || postEntity.Status != PostStatus.Scheduled)
                {
                    Console.WriteLine($"Post {postId} não encontrado ou não está agendado. Status: {postEntity?.Status}");
                    return; 
                }

                Console.WriteLine($"Iniciando publicação agendada para o post {postId}: {postEntity.Title}");

                foreach (var provider in postEntity.Providers)
                {
                    switch (provider.ToLower())
                    {
                        case "facebook":
                            await scopedFacebookService.PublishPostAsync(postEntity);
                            break;
                        case "instagram":
                            await scopedInstagramService.PublishPostAsync(postEntity);
                            break;
                        case "linkedin":
                            await scopedLinkedInService.PublishPostAsync(postEntity);
                            break;
                        default:
                            Console.WriteLine($"Provedor não suportado para post agendado: {provider}");
                            break;
                    }
                }

                postEntity.Status = PostStatus.Published;
                postEntity.PublishedAtUtc = DateTime.UtcNow;
                await scopedPostService.UpdateAsync(postEntity);
                Console.WriteLine($"Publicação agendada para o post {postId} concluída.");
            }
        }
    }
}

