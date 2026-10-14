using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Services;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PublicAccessLogController(IPublicAccessLogService service, IEmployeeDirectory employees, IPjDirectory contractors) : ControllerBase
    {
        [AllowAnonymous]
        [HttpGet("employee")]
        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        public async Task<ActionResult<EmployeeIdentityDto>> GetEmployee([FromQuery] string? chapa, CancellationToken cancellationToken, [FromQuery] string employmentType = "CLT", [FromQuery] string? cpf = null)
        {
            try
            {
                employmentType = AccessIdentity.NormalizeType(employmentType);
                var employee = await AccessIdentity.FindAsync(employmentType, employmentType == "PJ" ? cpf ?? "" : chapa ?? "", employees, contractors, cancellationToken);
                if (employee is null) return NotFound(new { error = employmentType == "PJ" ? "CPF não encontrado no cadastro PJ." : "Chapa não encontrada no RH." });
                return Ok(employee);
            }
            catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
            catch (EmployeeDirectoryUnavailableException ex) { return StatusCode(503, new { error = ex.Message }); }
        }

        [AllowAnonymous]
        [HttpPost]
        public async Task<ActionResult<PublicAccessLogResponseDto>> Create(PublicAccessLogCreateDto dto)
        {
            try { return Ok(await service.CreateAsync(dto, GetClientIpAddress(), Request.Headers["User-Agent"].ToString())); }
            catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
            catch (EmployeeDirectoryUnavailableException ex) { return StatusCode(503, new { error = ex.Message }); }
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
            [FromQuery] string? employmentType,
            [FromQuery] int? contentId,
            [FromQuery] int currentPage = 1,
            [FromQuery] int perPage = 50,
            [FromQuery] int? pageSize = null)
        {
            if (!string.IsNullOrWhiteSpace(employmentType))
            {
                try { employmentType = AccessIdentity.NormalizeType(employmentType); }
                catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
            }
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
                EmploymentType = employmentType,
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
