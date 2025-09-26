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
                SocialNetwork = "Facebook",
                PublishDate = DateTime.UtcNow,
                Status = PostStatus.Pending,
                Message = "Publicação pendente no Facebook."
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
                var graphApiVersion = "v19.0"; // Versão da API do Graph, pode ser configurável

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
                    // Se houver um link no post.Message ou em outro campo, adicione-o aqui
                    // content.Add("link", "sua_url_aqui");
                }

                // Adicionar lógica para posts agendados, se aplicável
                if (post.ScheduledAtUtc.HasValue && post.ScheduledAtUtc.Value > DateTime.UtcNow)
                {
                    content.Add("published", "false");
                    content.Add("scheduled_publish_time", new DateTimeOffset(post.ScheduledAtUtc.Value).ToUnixTimeSeconds().ToString());
                }

                var jsonContent = JsonSerializer.Serialize(content);
                var httpContent = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(requestUrl, httpContent);
                response.EnsureSuccessStatusCode();

                var responseString = await response.Content.ReadAsStringAsync();
                var jsonResponse = JsonDocument.Parse(responseString);
                var postId = jsonResponse.RootElement.GetProperty("id").GetString();

                // Atualizar log com sucesso
                log.Status = PostStatus.Published;
                log.Message = $"Publicado com sucesso no Facebook. Post ID: {postId}";
                post.FacebookPostId = postId;
                Console.WriteLine($"Publicado no Facebook: {post.Title} (ID: {postId})");
            }
            catch (HttpRequestException httpEx)
            {
                log.Status = PostStatus.Failed;
                log.Message = $"Falha na requisição HTTP ao Facebook: {httpEx.Message}";
                Console.Error.WriteLine($"Erro HTTP ao publicar no Facebook: {httpEx.Message}");
                if (httpEx.StatusCode.HasValue)
                {
                    var errorContent = await httpEx.GetContentAsByteArrayAsync();
                    Console.Error.WriteLine($"Conteúdo do erro: {System.Text.Encoding.UTF8.GetString(errorContent)}");
                }
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

