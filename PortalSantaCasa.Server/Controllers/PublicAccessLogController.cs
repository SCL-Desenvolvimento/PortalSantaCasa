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
                Page = NormalizePage(dto.Page),
                AccessedAt = DateTimeOffset.UtcNow,
                IpAddress = GetClientIpAddress(),
                UserAgent = Request.Headers["User-Agent"].ToString()
            };

            _context.PublicAccessLogs.Add(log);
            await _context.SaveChangesAsync();

            return Ok(ToResponse(log));
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
                query = query.Where(log => pageAliases.Contains(log.Page));
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
            var logs = await query
                .OrderByDescending(log => log.AccessedAt)
                .Skip((currentPage - 1) * perPage)
                .Take(perPage)
                .Select(log => new PublicAccessLogResponseDto
                {
                    Id = log.Id,
                    Name = log.Name,
                    RE = log.RE,
                    Sector = log.Sector,
                    Page = log.Page,
                    AccessedAt = log.AccessedAt,
                    IpAddress = log.IpAddress,
                    UserAgent = log.UserAgent
                })
                .ToListAsync();

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
            return new PublicAccessLogResponseDto
            {
                Id = log.Id,
                Name = log.Name,
                RE = log.RE,
                Sector = log.Sector,
                Page = log.Page,
                AccessedAt = log.AccessedAt,
                IpAddress = log.IpAddress,
                UserAgent = log.UserAgent
            };
        }

        private static string NormalizePage(string? page)
        {
            var normalized = page?.Trim().ToLowerInvariant();

            return normalized switch
            {
                "notícia" or "notícias" or "noticia" or "noticias" => "noticias",
                "comunicado" or "comunicados" => "comunicados",
                "qualidade" or "minuto de qualidade" => "qualidade",
                _ => normalized ?? string.Empty
            };
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
