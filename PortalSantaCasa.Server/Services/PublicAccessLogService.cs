using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class PublicAccessLogService(PortalSantaCasaDbContext context) : IPublicAccessLogService
    {
        private readonly PortalSantaCasaDbContext _context = context;

        public async Task<PublicAccessLogResponseDto> CreateAsync(PublicAccessLogCreateDto dto, string? ipAddress, string userAgent)
        {
            if (string.IsNullOrWhiteSpace(dto.Name) ||
                string.IsNullOrWhiteSpace(dto.RE) ||
                string.IsNullOrWhiteSpace(dto.Sector) ||
                string.IsNullOrWhiteSpace(dto.Page))
            {
                throw new ArgumentException("Nome, RE, setor e pagina sao obrigatorios.");
            }

            var log = new PublicAccessLog
            {
                Name = dto.Name.Trim(),
                RE = dto.RE.Trim(),
                Sector = dto.Sector.Trim(),
                Page = FormatPage(dto.Page, dto.ContentId, dto.ContentTitle),
                AccessedAt = DateTimeOffset.UtcNow,
                IpAddress = ipAddress,
                UserAgent = userAgent
            };

            _context.PublicAccessLogs.Add(log);
            await _context.SaveChangesAsync();

            return ToResponse(log);
        }

        public async Task<IEnumerable<PublicAccessLogContentOptionDto>> GetContentOptionsAsync(string pageType)
        {
            var normalizedPageType = NormalizePage(pageType);

            if (normalizedPageType == "comunicados")
            {
                var announcements = await _context.InternalAnnouncements
                    .AsNoTracking()
                    .OrderByDescending(item => item.PublishDate)
                    .Select(item => new PublicAccessLogContentOptionDto
                    {
                        Id = item.Id,
                        Title = item.Title
                    })
                    .ToListAsync();

                return announcements;
            }

            if (normalizedPageType is "noticias" or "qualidade")
            {
                var isQualityMinute = normalizedPageType == "qualidade";
                var news = await _context.News
                    .AsNoTracking()
                    .Where(item => item.IsQualityMinute == isQualityMinute)
                    .OrderByDescending(item => item.CreatedAt)
                    .Select(item => new PublicAccessLogContentOptionDto
                    {
                        Id = item.Id,
                        Title = item.Title
                    })
                    .ToListAsync();

                return news;
            }

            throw new ArgumentException("Selecione Noticias, Comunicados ou Qualidade.");
        }

        public async Task<PublicAccessLogReportDto> GetReportAsync(PublicAccessLogReportQueryDto filter)
        {
            var currentPage = filter.CurrentPage;
            var perPage = filter.PerPage;
            var effectivePageType = NormalizePage(filter.PageType);
            var effectiveStartDate = filter.StartDate;
            var effectiveEndDate = filter.EndDate;
            var sector = filter.Sector;
            var contentId = filter.ContentId;
            currentPage = Math.Max(1, currentPage);
            perPage = Math.Clamp(perPage, 1, 100000);

            var query = _context.PublicAccessLogs.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(effectivePageType))
            {
                var pageAliases = GetPageAliases(effectivePageType);
                query = query.Where(log =>
                    pageAliases.Contains(log.Page) ||
                    log.Page.StartsWith(effectivePageType + "::"));

                if (contentId.HasValue)
                {
                    var contentPrefix = $"{effectivePageType}::{contentId.Value}::";
                    query = query.Where(log => log.Page.StartsWith(contentPrefix));
                }
            }

            if (effectiveStartDate.HasValue)
            {
                query = query.Where(log => log.AccessedAt >= effectiveStartDate.Value);
            }

            if (effectiveEndDate.HasValue)
            {
                query = query.Where(log => log.AccessedAt <= effectiveEndDate.Value);
            }

            if (!string.IsNullOrWhiteSpace(sector))
            {
                var normalizedSector = sector.Trim();
                query = query.Where(log => log.Sector == normalizedSector);
            }

            var total = await query.CountAsync();
            var logs = (await query
                .OrderByDescending(log => log.AccessedAt)
                .Skip((currentPage - 1) * perPage)
                .Take(perPage)
                .ToListAsync())
                .Select(ToResponse)
                .ToList();

            return new PublicAccessLogReportDto
            {
                CurrentPage = currentPage,
                PerPage = perPage,
                Total = total,
                Pages = (int)Math.Ceiling(total / (double)perPage),
                Logs = logs
            };
        }

        private static PublicAccessLogResponseDto ToResponse(PublicAccessLog log)
        {
            var pageDetails = ParsePage(log.Page);

            return new PublicAccessLogResponseDto
            {
                Id = log.Id,
                Name = log.Name,
                RE = log.RE,
                Sector = log.Sector,
                Page = pageDetails.Page,
                ContentId = pageDetails.ContentId,
                ContentTitle = pageDetails.ContentTitle,
                AccessedAt = log.AccessedAt,
                IpAddress = log.IpAddress,
                UserAgent = log.UserAgent
            };
        }

        private static string NormalizePage(string? page)
        {
            var normalized = page?.Split("::", 2, StringSplitOptions.None)[0]
                .Trim()
                .ToLowerInvariant();

            return normalized switch
            {
                "notícia" or "notícias" or "noticia" or "noticias" => "noticias",
                "comunicado" or "comunicados" => "comunicados",
                "qualidade" or "minuto de qualidade" => "qualidade",
                _ => normalized ?? string.Empty
            };
        }

        private static string FormatPage(string page, int? contentId, string? contentTitle)
        {
            var normalizedPage = NormalizePage(page);
            var normalizedTitle = contentTitle?.Trim();

            if (!contentId.HasValue || string.IsNullOrWhiteSpace(normalizedTitle))
            {
                return normalizedPage;
            }

            return $"{normalizedPage}::{contentId.Value}::{normalizedTitle}";
        }

        private static (string Page, int? ContentId, string? ContentTitle) ParsePage(string page)
        {
            var parts = page.Split("::", 3, StringSplitOptions.None);
            var normalizedPage = NormalizePage(parts[0]);

            if (parts.Length < 3 ||
                !int.TryParse(parts[1], out var contentId) ||
                string.IsNullOrWhiteSpace(parts[2]))
            {
                return (normalizedPage, null, null);
            }

            return (normalizedPage, contentId, parts[2]);
        }

        private static string[] GetPageAliases(string pageType)
        {
            return pageType switch
            {
                "noticias" => new[] { "noticias", "Notícias", "Noticias" },
                "comunicados" => new[] { "comunicados", "Comunicados" },
                "qualidade" => new[] { "qualidade", "Qualidade", "Minuto de Qualidade" },
                _ => new[] { pageType }
            };
        }
    }
}
