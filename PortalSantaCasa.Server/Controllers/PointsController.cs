using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Interfaces;
using PortalSantaCasa.Server.Services;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PointsController(IPointsService service, ILogger<PointsController> logger) : ControllerBase
    {
        private readonly ILogger<PointsController> _logger = logger;

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<ActionResult<RegisterPointsResponseDto>> Register(RegisterPointsDto dto)
        {
            _logger.LogInformation(
                "Register points DTO recebido: {@RegisterPointsDto}",
                new
                {
                    dto.Name,
                    dto.RE,
                    dto.Sector,
                    dto.EventType,
                    dto.Difficulty,
                    dto.ReferenceId,
                    dto.ReferenceTitle,
                    dto.TimeSeconds
                });


            try { return Ok(await service.RegisterAsync(dto)); }
            catch (PointsRegistrationException ex)
            {
                if (ex.IsConflict) return Conflict(new { error = ex.Message });
                if (ex.EventType != null)
                    return BadRequest(new { error = ex.Message, eventType = ex.EventType, difficulty = ex.Difficulty });
                return BadRequest(new { error = ex.Message });
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Erro de banco ao registrar pontuacao. DTO: {@RegisterPointsDto}", dto);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "Erro ao gravar pontuacao no banco."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro inesperado ao registrar pontuacao. DTO: {@RegisterPointsDto}", dto);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "Erro inesperado ao registrar pontuacao."
                });
            }
        }

        [Authorize(Roles = "admin,Admin,editor,Editor,superadmin,SuperAdmin")]
        [HttpGet("ranking")]
        public async Task<ActionResult<IEnumerable<RankingDto>>> GetRanking([FromQuery] int limit = 50) =>
            Ok(await service.GetRankingAsync(limit));

        [Authorize(Roles = "admin,Admin,editor,Editor,superadmin,SuperAdmin")]
        [HttpGet("events")]
        public async Task<ActionResult<IEnumerable<PointEventResponseDto>>> GetEvents(
            [FromQuery] string? re, [FromQuery] string? eventType, [FromQuery] string? referenceId,
            [FromQuery] int page = 1, [FromQuery] int pageSize = 50) =>
            Ok(await service.GetEventsAsync(re, eventType, referenceId, page, pageSize));

        [Authorize(Roles = "admin,Admin,editor,Editor,superadmin,SuperAdmin")]
        [HttpGet("rules")]
        public async Task<ActionResult<IEnumerable<PointRuleDto>>> GetRules() => Ok(await service.GetRulesAsync());

        [Authorize(Roles = "admin,Admin,superadmin,SuperAdmin")]
        [HttpPut("rules/{id}")]
        public async Task<ActionResult<PointRuleDto>> UpdateRule(int id, UpdatePointRuleDto dto)
        {
            try
            {
                var result = await service.UpdateRuleAsync(id, dto);
                return result == null ? NotFound() : Ok(result);
            }
            catch (ArgumentException ex) { return BadRequest(new { error = ex.Message }); }
        }
    }
}
