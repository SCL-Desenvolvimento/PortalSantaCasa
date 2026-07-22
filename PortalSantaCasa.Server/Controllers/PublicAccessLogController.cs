using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PublicAccessLogController : ControllerBase
    {
        private readonly PortalSantaCasaDbContext _context;

        public PublicAccessLogController(PortalSantaCasaDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<ActionResult<PublicAccessLogResponseDto>> Create(PublicAccessLogCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name) ||
                string.IsNullOrWhiteSpace(dto.RE) ||
                string.IsNullOrWhiteSpace(dto.Sector) ||
                string.IsNullOrWhiteSpace(dto.Page))
            {
                return BadRequest(new { error = "Nome, RE, setor e pagina sao obrigatorios." });
            }

            var log = new PublicAccessLog
            {
                Name = dto.Name.Trim(),
                RE = dto.RE.Trim(),
                Sector = dto.Sector.Trim(),
                Page = FormatPage(dto.Page, dto.ContentId, dto.ContentTitle),
                AccessedAt = DateTimeOffset.UtcNow,
                IpAddress = GetClientIpAddress(),
                UserAgent = Request.Headers["User-Agent"].ToString()
            };

            _context.PublicAccessLogs.Add(log);
            await _context.SaveChangesAsync();

            return Ok(ToResponse(log));
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpGet("content-options")]
        public async Task<ActionResult<IEnumerable<PublicAccessLogContentOptionDto>>> GetContentOptions(
            [FromQuery] string pageType)
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

                return Ok(announcements);
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

                return Ok(news);
            }

            return BadRequest(new { error = "Selecione Noticias, Comunicados ou Qualidade." });
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpGet]
        public async Task<IActionResult> GetReport(
            [FromQuery] string? page,
            [FromQuery] string? pageType,
            [FromQuery] DateTimeOffset? dateFrom,
            [FromQuery] DateTimeOffset? dateTo,
            [FromQuery] DateTimeOffset? startDate,
            [FromQuery] DateTimeOffset? endDate,
            [FromQuery] string? sector,
            [FromQuery] int? contentId,
            [FromQuery] int currentPage = 1,
            [FromQuery] int perPage = 50,
            [FromQuery] int? pageSize = null)
        {
            var pageQueryIsPagination = false;

            if (Request.Query.TryGetValue("page", out var pageQueryValue) &&
                int.TryParse(pageQueryValue.FirstOrDefault(), out var requestedPage))
            {
                currentPage = requestedPage;
                pageQueryIsPagination = true;
            }

            var effectivePageType = NormalizePage(pageType ?? (pageQueryIsPagination ? null : page));
            var effectiveStartDate = startDate ?? dateFrom;
            var effectiveEndDate = endDate ?? dateTo;

            currentPage = Math.Max(1, currentPage);
            perPage = Math.Clamp(pageSize ?? perPage, 1, 100000);

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

            return Ok(new
            {
                currentPage,
                perPage,
                total,
                pages = (int)Math.Ceiling(total / (double)perPage),
                logs
            });
        }

        private string? GetClientIpAddress()
        {
            var forwardedFor = Request.Headers["X-Forwarded-For"].FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(forwardedFor))
            {
                return forwardedFor.Split(',')[0].Trim();
            }

            return HttpContext.Connection.RemoteIpAddress?.ToString();
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
