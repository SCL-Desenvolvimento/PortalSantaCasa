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
                SocialNetwork = "LinkedIn",
                PublishDate = DateTime.UtcNow,
                Status = PostStatus.Pending,
                Message = "Publicação pendente no LinkedIn."
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
                var personUrn = authToken.AccountId; // Assumindo que AccountId armazena o URN da pessoa/organização

                // Lógica para publicação de imagem no LinkedIn é mais complexa (requer upload prévio)
                // Para simplificar, vamos focar em posts de texto/link por enquanto.
                // Se houver ImageUrl, faremos um post com imagem, mas o upload real da imagem é um processo separado.
                // Aqui, estamos apenas referenciando a URL da imagem.

                var postContent = new
                {
                    author = $"urn:li:person:{personUrn}", // Ou urn:li:organization:{organizationId}
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
                                    media = post.ImageUrl, // Isso não é o ideal, o LinkedIn espera um URN de imagem após upload
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
                response.EnsureSuccessStatusCode();

                var responseString = await response.Content.ReadAsStringAsync();
                var jsonResponse = JsonDocument.Parse(responseString);
                var linkedInPostId = jsonResponse.RootElement.GetProperty("id").GetString();

                log.Status = PostStatus.Published;
                log.Message = $"Publicado com sucesso no LinkedIn. Post ID: {linkedInPostId}";
                post.LinkedInPostId = linkedInPostId;
                Console.WriteLine($"Publicado no LinkedIn: {post.Title} (ID: {linkedInPostId})");
            }
            catch (HttpRequestException httpEx)
            {
                log.Status = PostStatus.Failed;
                log.Message = $"Falha na requisição HTTP ao LinkedIn: {httpEx.Message}";
                Console.Error.WriteLine($"Erro HTTP ao publicar no LinkedIn: {httpEx.Message}");
                if (httpEx.StatusCode.HasValue)
                {
                    var errorContent = await httpEx.GetContentAsByteArrayAsync();
                    Console.Error.WriteLine($"Conteúdo do erro: {System.Text.Encoding.UTF8.GetString(errorContent)}");
                }
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

