using System.Net;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services;

public sealed partial class PublicSearchService : IPublicSearchService
{
    private const int ResultsPerType = 4;
    private readonly PortalSantaCasaDbContext _context;
    private readonly IDocumentService _documentService;

    public PublicSearchService(PortalSantaCasaDbContext context, IDocumentService documentService)
    {
        _context = context;
        _documentService = documentService;
    }

    public async Task<IReadOnlyCollection<PublicSearchResultDto>> SearchAsync(string query, string documentRole)
    {
        var term = query.Trim();
        if (term.Length < 2) return [];

        var now = DateTimeOffset.UtcNow;
        var news = await _context.News
            .AsNoTracking()
            .Where(item => item.IsActive &&
                (item.Title.Contains(term) ||
                 (item.Summary != null && item.Summary.Contains(term)) ||
                 (item.Content != null && item.Content.Contains(term))))
            .OrderByDescending(item => item.Title.StartsWith(term))
            .ThenByDescending(item => item.CreatedAt)
            .Take(ResultsPerType)
            .Select(item => new { item.Id, item.Title, item.Summary, item.Content, item.IsQualityMinute })
            .ToListAsync();

        var events = await _context.Events
            .AsNoTracking()
            .Where(item => item.IsActive &&
                (item.Title.Contains(term) ||
                 (item.Description != null && item.Description.Contains(term)) ||
                 (item.Location != null && item.Location.Contains(term))))
            .OrderByDescending(item => item.Title.StartsWith(term))
            .ThenBy(item => item.EventDate)
            .Take(ResultsPerType)
            .Select(item => new { item.Id, item.Title, item.Description, item.Location, item.EventDate })
            .ToListAsync();

        var announcements = await _context.InternalAnnouncements
            .AsNoTracking()
            .Where(item => item.IsActive && item.PublishDate <= now &&
                (item.ExpirationDate == null || item.ExpirationDate >= now) &&
                (item.Title.Contains(term) || item.Content.Contains(term)))
            .OrderByDescending(item => item.Title.StartsWith(term))
            .ThenByDescending(item => item.PublishDate)
            .Take(ResultsPerType)
            .Select(item => new { item.Id, item.Title, item.Content })
            .ToListAsync();

        var forms = await _context.Forms
            .AsNoTracking()
            .Where(item => item.Title.Contains(term) || item.Description.Contains(term))
            .OrderByDescending(item => item.Title.StartsWith(term))
            .Take(ResultsPerType)
            .Select(item => new { item.Id, item.Title, item.Description, item.FormsLink })
            .ToListAsync();

        var documents = (await _documentService.SearchAsync(term, documentRole))
            .Where(item => !string.IsNullOrWhiteSpace(item.FileName))
            .Take(ResultsPerType)
            .ToList();

        return news.Select(item => new PublicSearchResultDto
            {
                Id = $"news-{item.Id}", Type = "news", Title = item.Title,
                Category = item.IsQualityMinute ? "Qualidade" : "Notícias",
                Icon = item.IsQualityMinute ? "fas fa-star" : "fas fa-newspaper",
                Url = $"/noticia/{item.Id}", Description = Summarize(item.Summary ?? item.Content)
            })
            .Concat(events.Select(item => new PublicSearchResultDto
            {
                Id = $"event-{item.Id}", Type = "event", Title = item.Title,
                Category = "Eventos", Icon = "fas fa-calendar-alt", Url = $"/evento/{item.Id}",
                Description = Summarize(item.Description ?? item.Location)
            }))
            .Concat(announcements.Select(item => new PublicSearchResultDto
            {
                Id = $"announcement-{item.Id}", Type = "announcement", Title = item.Title,
                Category = "Comunicados", Icon = "fas fa-bullhorn", Url = $"/comunicado/{item.Id}",
                Description = Summarize(item.Content)
            }))
            .Concat(documents.Select(item => new PublicSearchResultDto
            {
                Id = $"document-{item.Id}", Type = "document", Title = item.Name,
                Category = "Documentos", Icon = "fas fa-file-alt", Url = $"/documentos?documentId={item.Id}",
                Description = item.FileName
            }))
            .Concat(forms.Select(item => CreateFormResult(item.Id, item.Title, item.Description, item.FormsLink)))
            .Take(16)
            .ToList();
    }

    private static PublicSearchResultDto CreateFormResult(int id, string title, string description, string link)
    {
        var isExternal = Uri.TryCreate(link, UriKind.Absolute, out var uri) &&
            (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);

        return new PublicSearchResultDto
        {
            Id = $"form-{id}", Type = "form", Title = title, Category = "Formulários",
            Icon = "fas fa-clipboard-list", Url = isExternal ? link : "/formularios",
            Description = Summarize(description), IsExternal = isExternal
        };
    }

    private static string? Summarize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var plainText = WebUtility.HtmlDecode(HtmlTagRegex().Replace(value, " "));
        plainText = WhitespaceRegex().Replace(plainText, " ").Trim();
        return plainText.Length <= 110 ? plainText : $"{plainText[..107]}...";
    }

    [GeneratedRegex("<[^>]+>")]
    private static partial Regex HtmlTagRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();
}
