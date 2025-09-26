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
                SocialNetwork = "Instagram",
                PublishDate = DateTime.UtcNow,
                Status = PostStatus.Pending,
                Message = "Publicação pendente no Instagram."
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

                var instagramBusinessAccountId = authToken.AccountId; // Assumindo que AccountId armazena o Instagram Business Account ID
                var accessToken = authToken.AccessToken;
                var graphApiVersion = "v19.0"; // Versão da API do Graph, pode ser configurável

                if (string.IsNullOrEmpty(post.ImageUrl))
                {
                    throw new Exception("Imagem é necessária para publicação no Instagram.");
                }

                // Etapa 1: Criar o contêiner de mídia
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
                mediaContainerResponse.EnsureSuccessStatusCode();

                var mediaContainerResponseString = await mediaContainerResponse.Content.ReadAsStringAsync();
                var mediaContainerJsonResponse = JsonDocument.Parse(mediaContainerResponseString);
                var mediaContainerId = mediaContainerJsonResponse.RootElement.GetProperty("id").GetString();

                // Etapa 2: Publicar a mídia usando o ID do contêiner
                var publishContent = new Dictionary<string, string>
                {
                    { "creation_id", mediaContainerId },
                    { "access_token", accessToken }
                };
                var publishJson = JsonSerializer.Serialize(publishContent);
                var publishHttpContent = new StringContent(publishJson, System.Text.Encoding.UTF8, "application/json");

                var publishRequestUrl = $"https://graph.facebook.com/{graphApiVersion}/{instagramBusinessAccountId}/media_publish";
                var publishResponse = await _httpClient.PostAsync(publishRequestUrl, publishHttpContent);
                publishResponse.EnsureSuccessStatusCode();

                var publishResponseString = await publishResponse.Content.ReadAsStringAsync();
                var publishJsonResponse = JsonDocument.Parse(publishResponseString);
                var instagramPostId = publishJsonResponse.RootElement.GetProperty("id").GetString();

                // Atualizar log com sucesso
                log.Status = PostStatus.Published;
                log.Message = $"Publicado com sucesso no Instagram. Post ID: {instagramPostId}";
                post.InstagramPostId = instagramPostId;
                Console.WriteLine($"Publicado no Instagram: {post.Title} (ID: {instagramPostId})");
            }
            catch (HttpRequestException httpEx)
            {
                log.Status = PostStatus.Failed;
                log.Message = $"Falha na requisição HTTP ao Instagram: {httpEx.Message}";
                Console.Error.WriteLine($"Erro HTTP ao publicar no Instagram: {httpEx.Message}");
                if (httpEx.StatusCode.HasValue)
                {
                    var errorContent = await httpEx.GetContentAsByteArrayAsync();
                    Console.Error.WriteLine($"Conteúdo do erro: {System.Text.Encoding.UTF8.GetString(errorContent)}");
                }
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

