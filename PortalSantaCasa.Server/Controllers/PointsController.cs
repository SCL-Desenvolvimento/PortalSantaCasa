using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PointsController : ControllerBase
    {
        private static readonly HashSet<string> SingleCreditEventTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "NEWS_VIEW",
            "ANNOUNCEMENT_VIEW",
            "QUALITY_VIEW"
        };

        private readonly PortalSantaCasaDbContext _context;
        private readonly ILogger<PointsController> _logger;

        public PointsController(PortalSantaCasaDbContext context, ILogger<PointsController> logger)
        {
            _context = context;
            _logger = logger;
        }

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

            try
            {
                var re = NormalizeRE(dto.RE);
                var name = dto.Name?.Trim();
                var sector = dto.Sector?.Trim();
                var eventType = NormalizeEventType(dto.EventType);
                var difficulty = NormalizeDifficulty(dto.Difficulty);
                var referenceId = dto.ReferenceId?.Trim();
                var referenceTitle = dto.ReferenceTitle?.Trim();

                if (string.IsNullOrWhiteSpace(name))
                    return BadRequest(new { error = "Nome e obrigatorio para registrar pontuacao." });

                if (string.IsNullOrWhiteSpace(re))
                    return BadRequest(new { error = "RE e obrigatorio para registrar pontuacao." });

                if (string.IsNullOrWhiteSpace(sector))
                    return BadRequest(new { error = "Setor e obrigatorio para registrar pontuacao." });

                if (string.IsNullOrWhiteSpace(eventType))
                    return BadRequest(new { error = "Tipo de evento e obrigatorio para registrar pontuacao." });

                var rule = await FindActiveRuleAsync(eventType, difficulty);

                if (rule == null)
                {
                    return BadRequest(new
                    {
                        error = "Regra de pontuacao ativa nao encontrada para o evento e dificuldade informados.",
                        eventType,
                        difficulty
                    });
                }

                if (SingleCreditEventTypes.Contains(eventType))
                {
                    if (string.IsNullOrWhiteSpace(referenceId))
                        return BadRequest(new { error = "Referencia e obrigatoria para este tipo de evento." });

                    var alreadyScored = await _context.PointEvents.AnyAsync(pointEvent =>
                        pointEvent.RE == re &&
                        pointEvent.EventType == eventType &&
                        pointEvent.ReferenceId == referenceId);

                    if (alreadyScored)
                        return Conflict(new { error = "Pontuacao ja registrada para este RE, evento e referencia." });
                }

                var now = DateTime.UtcNow;
                var player = await _context.Players.FirstOrDefaultAsync(p => p.RE == re);

                if (player == null)
                {
                    player = new Player
                    {
                        RE = re,
                        Name = name,
                        Sector = sector,
                        LastAccess = now,
                        CreatedAt = now,
                        UpdatedAt = now
                    };

                    _context.Players.Add(player);
                }
                else
                {
                    player.Name = name;
                    player.Sector = sector;
                    player.LastAccess = now;
                    player.UpdatedAt = now;
                }

                var points = rule.Points + rule.BonusPoints;

                var pointEvent = new PointEvent
                {
                    RE = re,
                    EventType = eventType,
                    ReferenceId = referenceId,
                    ReferenceTitle = referenceTitle,
                    Difficulty = difficulty,
                    Points = points,
                    TimeSeconds = dto.TimeSeconds,
                    CreatedAt = now
                };

                _context.PointEvents.Add(pointEvent);
                await _context.SaveChangesAsync();

                return Ok(new RegisterPointsResponseDto
                {
                    Points = points,
                    EventType = eventType,
                    RE = re,
                    Message = "Pontuacao registrada com sucesso."
                });
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Erro de banco ao registrar pontuacao. DTO: {@RegisterPointsDto}", dto);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "Erro ao gravar pontuacao no banco.",
                    detail = ex.InnerException?.Message ?? ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro inesperado ao registrar pontuacao. DTO: {@RegisterPointsDto}", dto);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "Erro inesperado ao registrar pontuacao.",
                    detail = ex.Message
                });
            }
        }

        [HttpGet("ranking")]
        public async Task<ActionResult<IEnumerable<RankingDto>>> GetRanking([FromQuery] int limit = 50)
        {
            limit = Math.Clamp(limit, 1, 500);

            var ranking = await _context.PointEvents
                .AsNoTracking()
                .GroupBy(pointEvent => pointEvent.RE)
                .Join(
                    _context.Players.AsNoTracking(),
                    group => group.Key,
                    player => player.RE,
                    (group, player) => new RankingDto
                    {
                        RE = group.Key,
                        Name = player.Name,
                        Sector = player.Sector,
                        LastAccess = player.LastAccess,
                        TotalPoints = group.Sum(pointEvent => pointEvent.Points),
                        TotalEvents = group.Count()
                    })
                .OrderByDescending(item => item.TotalPoints)
                .ThenBy(item => item.Name)
                .Take(limit)
                .ToListAsync();

            return Ok(ranking);
        }

        [HttpGet("events")]
        public async Task<ActionResult<IEnumerable<PointEventResponseDto>>> GetEvents(
            [FromQuery] string? re,
            [FromQuery] string? eventType,
            [FromQuery] string? referenceId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 500);

            var query = _context.PointEvents
                .AsNoTracking()
                .AsQueryable();

            var normalizedRE = NormalizeRE(re);
            var normalizedEventType = NormalizeEventType(eventType);
            var normalizedReferenceId = referenceId?.Trim();

            if (!string.IsNullOrWhiteSpace(normalizedRE))
                query = query.Where(pointEvent => pointEvent.RE == normalizedRE);

            if (!string.IsNullOrWhiteSpace(normalizedEventType))
                query = query.Where(pointEvent => pointEvent.EventType == normalizedEventType);

            if (!string.IsNullOrWhiteSpace(normalizedReferenceId))
                query = query.Where(pointEvent => pointEvent.ReferenceId == normalizedReferenceId);

            var events = await query
                .OrderByDescending(pointEvent => pointEvent.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .GroupJoin(
                    _context.Players.AsNoTracking(),
                    pointEvent => pointEvent.RE,
                    player => player.RE,
                    (pointEvent, players) => new { pointEvent, player = players.FirstOrDefault() })
                .Select(item => new PointEventResponseDto
                {
                    Id = item.pointEvent.Id,
                    Name = item.player != null ? item.player.Name : item.pointEvent.RE,
                    RE = item.pointEvent.RE,
                    Sector = item.player != null ? item.player.Sector : null,
                    EventType = item.pointEvent.EventType,
                    Difficulty = item.pointEvent.Difficulty,
                    ReferenceId = item.pointEvent.ReferenceId,
                    ReferenceTitle = item.pointEvent.ReferenceTitle,
                    Points = item.pointEvent.Points,
                    TimeSeconds = item.pointEvent.TimeSeconds,
                    CreatedAt = item.pointEvent.CreatedAt
                })
                .ToListAsync();

            return Ok(events);
        }

        [HttpGet("rules")]
        public async Task<ActionResult<IEnumerable<PointRuleDto>>> GetRules()
        {
            var rules = await _context.PointRules
                .AsNoTracking()
                .OrderBy(rule => rule.EventType)
                .ThenBy(rule => rule.Difficulty)
                .Select(rule => new PointRuleDto
                {
                    Id = rule.Id,
                    EventType = rule.EventType,
                    Difficulty = rule.Difficulty,
                    Points = rule.Points,
                    BonusPoints = rule.BonusPoints,
                    IsActive = rule.IsActive
                })
                .ToListAsync();

            return Ok(rules);
        }

        [HttpPut("rules/{id}")]
        public async Task<ActionResult<PointRuleDto>> UpdateRule(int id, UpdatePointRuleDto dto)
        {
            if (dto.Points < 0 || dto.Bonus < 0)
                return BadRequest(new { error = "Pontos e bonus nao podem ser negativos." });

            var rule = await _context.PointRules.FindAsync(id);

            if (rule == null)
                return NotFound();

            rule.Points = dto.Points;
            rule.BonusPoints = dto.Bonus;
            rule.IsActive = dto.IsActive;
            rule.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new PointRuleDto
            {
                Id = rule.Id,
                EventType = rule.EventType,
                Difficulty = rule.Difficulty,
                Points = rule.Points,
                BonusPoints = rule.BonusPoints,
                IsActive = rule.IsActive
            });
        }

        private async Task<PointRule?> FindActiveRuleAsync(string eventType, string? difficulty)
        {
            var query = _context.PointRules
                .Where(rule => rule.IsActive && rule.EventType.ToUpper() == eventType);

            query = string.IsNullOrWhiteSpace(difficulty)
                ? query.Where(rule => rule.Difficulty == null || rule.Difficulty == string.Empty)
                : query.Where(rule => rule.Difficulty != null && rule.Difficulty.ToLower() == difficulty);

            return await query.FirstOrDefaultAsync();
        }

        private static PointEventResponseDto ToPointEventResponse(PointEvent pointEvent, Player player)
        {
            return new PointEventResponseDto
            {
                Id = pointEvent.Id,
                Name = player.Name,
                RE = player.RE,
                Sector = player.Sector,
                EventType = pointEvent.EventType,
                Difficulty = pointEvent.Difficulty,
                ReferenceId = pointEvent.ReferenceId,
                ReferenceTitle = pointEvent.ReferenceTitle,
                Points = pointEvent.Points,
                TimeSeconds = pointEvent.TimeSeconds,
                CreatedAt = pointEvent.CreatedAt
            };
        }

        private static string NormalizeRE(string? re)
        {
            return re?.Trim().ToUpperInvariant() ?? string.Empty;
        }

        private static string NormalizeEventType(string? eventType)
        {
            return eventType?.Trim().ToUpperInvariant() ?? string.Empty;
        }

        private static string? NormalizeDifficulty(string? difficulty)
        {
            var normalized = difficulty?.Trim().ToLowerInvariant();
            return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
        }
    }
}
