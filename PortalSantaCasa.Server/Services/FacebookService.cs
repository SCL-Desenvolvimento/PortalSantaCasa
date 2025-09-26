using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Enums;
using PortalSantaCasa.Server.Interfaces;
using System.Net.Http;
using System.Text.Json;

namespace PortalSantaCasa.Server.Services
{
    public class FacebookService : IFacebookService
    {
        private readonly PortalSantaCasaDbContext _context;
        private readonly HttpClient _httpClient;

        public FacebookService(PortalSantaCasaDbContext context, HttpClient httpClient)
        {
            _context = context;
            _httpClient = httpClient;
        }

        public async Task PublishPostAsync(PostEntity post)
        {
            Console.WriteLine($"Tentando publicar no Facebook: {post.Title}");

            var log = new PostPublishLog
            {
                PostId = post.Id,
                Provider = "Facebook",
                Action = "publish", // Ou "schedule" se for agendado
                Status = PostStatus.Draft, // Status inicial antes da tentativa de publicação
                Message = "Tentando publicar no Facebook."
            };
            _context.PostPublishLogs.Add(log);
            await _context.SaveChangesAsync();

            try
            {
                var authToken = await _context.AuthTokens
                    .FirstOrDefaultAsync(t => t.Provider == "facebook" && t.IsActive);

                if (authToken == null)
                {
                    throw new Exception("Token de acesso do Facebook não encontrado ou inativo.");
                }

                var pageId = authToken.AccountId; // Assumindo que AccountId armazena o Page ID
                var accessToken = authToken.AccessToken;
                var graphApiVersion = "v19.0"; // Versão da API do Graph

                string requestUrl;
                var content = new Dictionary<string, string>
        {
            { "message", post.Message },
            { "access_token", accessToken }
        };

                if (!string.IsNullOrEmpty(post.ImageUrl))
                {
                    // Publicar foto
                    requestUrl = $"https://graph.facebook.com/{graphApiVersion}/{pageId}/photos";
                    content.Add("url", post.ImageUrl);
                }
                else
                {
                    // Publicar texto/link
                    requestUrl = $"https://graph.facebook.com/{graphApiVersion}/{pageId}/feed";
                }

                // Agendamento, se aplicável
                if (post.ScheduledAtUtc.HasValue && post.ScheduledAtUtc.Value > DateTime.UtcNow)
                {
                    content.Add("published", "false");
                    content.Add("scheduled_publish_time", new DateTimeOffset(post.ScheduledAtUtc.Value).ToUnixTimeSeconds().ToString());
                }

                var jsonContent = JsonSerializer.Serialize(content);
                var httpContent = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(requestUrl, httpContent);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    log.Status = PostStatus.Failed;
                    log.Message = $"Erro do Facebook ({response.StatusCode}): {responseString}";
                    Console.Error.WriteLine($"Erro HTTP ao publicar no Facebook: {responseString}");
                    return;
                }

                var jsonResponse = JsonDocument.Parse(responseString);
                var postId = jsonResponse.RootElement.GetProperty("id").GetString();

                // Atualizar log com sucesso
                log.Status = PostStatus.Published;
                log.Message = $"Publicado com sucesso no Facebook. Post ID: {postId}";
                log.ExternalPostId = postId;
                post.FacebookPostId = postId;
                Console.WriteLine($"Publicado no Facebook: {post.Title} (ID: {postId})");
            }
            catch (Exception ex)
            {
                log.Status = PostStatus.Failed;
                log.Message = $"Falha ao publicar no Facebook: {ex.Message}";
                Console.Error.WriteLine($"Erro ao publicar no Facebook: {ex.Message}");
            }
            finally
            {
                await _context.SaveChangesAsync();
            }
        }

    }
}

