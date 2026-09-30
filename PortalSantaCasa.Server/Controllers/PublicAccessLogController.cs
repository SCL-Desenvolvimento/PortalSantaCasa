using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PublicAccessLogController(IPublicAccessLogService service) : ControllerBase
    {
        [AllowAnonymous]
        [HttpPost]
        public async Task<ActionResult<PublicAccessLogResponseDto>> Create(PublicAccessLogCreateDto dto)
        {
            try { return Ok(await service.CreateAsync(dto, GetClientIpAddress(), Request.Headers["User-Agent"].ToString())); }
            catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
        }

        [Authorize(Roles = "admin,Admin")]
        [HttpGet("content-options")]
        public async Task<ActionResult<IEnumerable<PublicAccessLogContentOptionDto>>> GetContentOptions([FromQuery] string pageType)
        {
            try { return Ok(await service.GetContentOptionsAsync(pageType)); }
            catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
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

            return Ok(await service.GetReportAsync(new PublicAccessLogReportQueryDto
            {
                PageType = pageType ?? (pageQueryIsPagination ? null : page),
                StartDate = startDate ?? dateFrom,
                EndDate = endDate ?? dateTo,
                Sector = sector,
                ContentId = contentId,
                CurrentPage = currentPage,
                PerPage = pageSize ?? perPage
            }));
        }

        private string? GetClientIpAddress()
        {
            return HttpContext.Connection.RemoteIpAddress?.ToString();
        }
    }
}
