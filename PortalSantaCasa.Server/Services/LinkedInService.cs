using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Enums;
using PortalSantaCasa.Server.Interfaces;
using System.Net.Http;
using System.Text.Json;

namespace PortalSantaCasa.Server.Services
{
    public class LinkedInService : ILinkedInService
    {
        private readonly PortalSantaCasaDbContext _context;
        private readonly HttpClient _httpClient;

        public LinkedInService(PortalSantaCasaDbContext context, HttpClient httpClient)
        {
            _context = context;
            _httpClient = httpClient;
        }

        public async Task PublishPostAsync(PostEntity post)
        {
            Console.WriteLine($"Tentando publicar no LinkedIn: {post.Title}");

            var log = new PostPublishLog
            {
                PostId = post.Id,
                Provider = "LinkedIn",
                Action = "publish",
                Status = PostStatus.Draft,
                Message = "Tentando publicar no LinkedIn."
            };
            _context.PostPublishLogs.Add(log);
            await _context.SaveChangesAsync();

            try
            {
                var authToken = await _context.AuthTokens
                    .FirstOrDefaultAsync(t => t.Provider == "linkedin" && t.IsActive);

                if (authToken == null)
                {
                    throw new Exception("Token de acesso do LinkedIn não encontrado ou inativo.");
                }

                var accessToken = authToken.AccessToken;
                var personUrn = authToken.AccountId; // Pode ser "person" ou "organization"

                var postContent = new
                {
                    author = $"urn:li:person:{personUrn}", // se for empresa, usar urn:li:organization:{orgId}
                    lifecycleState = "PUBLISHED",
                    specificContent = new
                    {
                        com_linkedin_ugc_ShareContent = new
                        {
                            shareCommentary = new
                            {
                                text = post.Message
                            },
                            shareMediaCategory = string.IsNullOrEmpty(post.ImageUrl) ? "NONE" : "IMAGE",
                            media = string.IsNullOrEmpty(post.ImageUrl) ? null : new[]
                            {
                        new
                        {
                            status = "READY",
                            media = post.ImageUrl, // LinkedIn espera URN após upload real
                            title = new { text = post.Title }
                        }
                    }
                        }
                    },
                    visibility = new
                    {
                        com_linkedin_ugc_MemberNetworkVisibility = "PUBLIC"
                    }
                };

                var jsonContent = JsonSerializer.Serialize(postContent);
                var httpContent = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");

                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");
                _httpClient.DefaultRequestHeaders.Add("X-Restli-Protocol-Version", "2.0.0");

                var response = await _httpClient.PostAsync("https://api.linkedin.com/v2/ugcPosts", httpContent);
                var responseString = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    log.Status = PostStatus.Failed;
                    log.Message = $"Erro do LinkedIn ({response.StatusCode}): {responseString}";
                    Console.Error.WriteLine($"Erro ao publicar no LinkedIn: {responseString}");
                    return;
                }

                var jsonResponse = JsonDocument.Parse(responseString);
                var linkedInPostId = jsonResponse.RootElement.GetProperty("id").GetString();

                log.Status = PostStatus.Published;
                log.Message = $"Publicado com sucesso no LinkedIn. Post ID: {linkedInPostId}";
                log.ExternalPostId = linkedInPostId;
                post.LinkedInPostId = linkedInPostId;
                Console.WriteLine($"Publicado no LinkedIn: {post.Title} (ID: {linkedInPostId})");
            }
            catch (Exception ex)
            {
                log.Status = PostStatus.Failed;
                log.Message = $"Falha ao publicar no LinkedIn: {ex.Message}";
                Console.Error.WriteLine($"Erro ao publicar no LinkedIn: {ex.Message}");
            }
            finally
            {
                await _context.SaveChangesAsync();
            }
        }
    }
}

