using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Enums;
using PortalSantaCasa.Server.Interfaces;
using System.Net.Http;
using System.Text.Json;

namespace PortalSantaCasa.Server.Services
{
    public class InstagramService : IInstagramService
    {
        private readonly PortalSantaCasaDbContext _context;
        private readonly HttpClient _httpClient;

        public InstagramService(PortalSantaCasaDbContext context, HttpClient httpClient)
        {
            _context = context;
            _httpClient = httpClient;
        }

        public async Task PublishPostAsync(PostEntity post)
        {
            Console.WriteLine($"Tentando publicar no Instagram: {post.Title}");

            var log = new PostPublishLog
            {
                PostId = post.Id,
                Provider = "Instagram",
                Action = "publish",
                Status = PostStatus.Draft,
                Message = "Tentando publicar no Instagram."
            };
            _context.PostPublishLogs.Add(log);
            await _context.SaveChangesAsync();

            try
            {
                var authToken = await _context.AuthTokens
                    .FirstOrDefaultAsync(t => t.Provider == "instagram" && t.IsActive);

                if (authToken == null)
                {
                    throw new Exception("Token de acesso do Instagram não encontrado ou inativo.");
                }

                var instagramBusinessAccountId = authToken.AccountId;
                var accessToken = authToken.AccessToken;
                var graphApiVersion = "v19.0";

                if (string.IsNullOrEmpty(post.ImageUrl))
                {
                    throw new Exception("Imagem é necessária para publicação no Instagram.");
                }

                // ===============================
                // Etapa 1: Criar o contêiner de mídia
                // ===============================
                var mediaContainerContent = new Dictionary<string, string>
        {
            { "image_url", post.ImageUrl },
            { "caption", post.Message },
            { "access_token", accessToken }
        };

                var mediaContainerJson = JsonSerializer.Serialize(mediaContainerContent);
                var mediaContainerHttpContent = new StringContent(mediaContainerJson, System.Text.Encoding.UTF8, "application/json");

                var mediaContainerRequestUrl = $"https://graph.facebook.com/{graphApiVersion}/{instagramBusinessAccountId}/media";
                var mediaContainerResponse = await _httpClient.PostAsync(mediaContainerRequestUrl, mediaContainerHttpContent);
                var mediaContainerResponseString = await mediaContainerResponse.Content.ReadAsStringAsync();

                if (!mediaContainerResponse.IsSuccessStatusCode)
                {
                    log.Status = PostStatus.Failed;
                    log.Message = $"Erro ao criar container de mídia ({mediaContainerResponse.StatusCode}): {mediaContainerResponseString}";
                    Console.Error.WriteLine($"Erro ao criar container de mídia: {mediaContainerResponseString}");
                    return;
                }

                var mediaContainerJsonResponse = JsonDocument.Parse(mediaContainerResponseString);
                var mediaContainerId = mediaContainerJsonResponse.RootElement.GetProperty("id").GetString();

                // ===============================
                // Etapa 2: Publicar a mídia
                // ===============================
                var publishContent = new Dictionary<string, string>
        {
            { "creation_id", mediaContainerId },
            { "access_token", accessToken }
        };

                var publishJson = JsonSerializer.Serialize(publishContent);
                var publishHttpContent = new StringContent(publishJson, System.Text.Encoding.UTF8, "application/json");

                var publishRequestUrl = $"https://graph.facebook.com/{graphApiVersion}/{instagramBusinessAccountId}/media_publish";
                var publishResponse = await _httpClient.PostAsync(publishRequestUrl, publishHttpContent);
                var publishResponseString = await publishResponse.Content.ReadAsStringAsync();

                if (!publishResponse.IsSuccessStatusCode)
                {
                    log.Status = PostStatus.Failed;
                    log.Message = $"Erro ao publicar no Instagram ({publishResponse.StatusCode}): {publishResponseString}";
                    Console.Error.WriteLine($"Erro ao publicar no Instagram: {publishResponseString}");
                    return;
                }

                var publishJsonResponse = JsonDocument.Parse(publishResponseString);
                var instagramPostId = publishJsonResponse.RootElement.GetProperty("id").GetString();

                // ===============================
                // Sucesso
                // ===============================
                log.Status = PostStatus.Published;
                log.Message = $"Publicado com sucesso no Instagram. Post ID: {instagramPostId}";
                log.ExternalPostId = instagramPostId;
                post.InstagramPostId = instagramPostId;
                Console.WriteLine($"Publicado no Instagram: {post.Title} (ID: {instagramPostId})");
            }
            catch (Exception ex)
            {
                log.Status = PostStatus.Failed;
                log.Message = $"Falha ao publicar no Instagram: {ex.Message}";
                Console.Error.WriteLine($"Erro ao publicar no Instagram: {ex.Message}");
            }
            finally
            {
                await _context.SaveChangesAsync();
            }
        }
    }
}

