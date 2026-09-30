using PortalSantaCasa.Server.Utils;
using Microsoft.EntityFrameworkCore;
using PortalSantaCasa.Server.Context;
using PortalSantaCasa.Server.DTOs;
using PortalSantaCasa.Server.Entities;
using PortalSantaCasa.Server.Interfaces;

namespace PortalSantaCasa.Server.Services
{
    public class PointsService(PortalSantaCasaDbContext context) : IPointsService
    {
        private readonly PortalSantaCasaDbContext _context = context;
        private static readonly HashSet<string> SingleCreditEventTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "NEWS_VIEW", "ANNOUNCEMENT_VIEW", "QUALITY_VIEW"
        };

        public async Task<RegisterPointsResponseDto> RegisterAsync(RegisterPointsDto dto)
        {
            var re = NormalizeRE(dto.RE);
            var name = dto.Name?.Trim();
            var sector = dto.Sector?.Trim();
            var eventType = NormalizeEventType(dto.EventType);
            var difficulty = NormalizeDifficulty(dto.Difficulty);
            var referenceId = dto.ReferenceId?.Trim();
            var referenceTitle = dto.ReferenceTitle?.Trim();

            if (string.IsNullOrWhiteSpace(name))
                throw new PointsRegistrationException("Nome e obrigatorio para registrar pontuacao.");

            if (string.IsNullOrWhiteSpace(re))
                throw new PointsRegistrationException("RE e obrigatorio para registrar pontuacao.");

            if (string.IsNullOrWhiteSpace(sector))
                throw new PointsRegistrationException("Setor e obrigatorio para registrar pontuacao.");

            if (string.IsNullOrWhiteSpace(eventType))
                throw new PointsRegistrationException("Tipo de evento e obrigatorio para registrar pontuacao.");

            var rule = await FindActiveRuleAsync(eventType, difficulty);

            if (rule == null)
            {
                throw new PointsRegistrationException(
                    "Regra de pontuacao ativa nao encontrada para o evento e dificuldade informados.",
                    eventType: eventType, difficulty: difficulty);
            }

            if (SingleCreditEventTypes.Contains(eventType))
            {
                if (string.IsNullOrWhiteSpace(referenceId))
                    throw new PointsRegistrationException("Referencia e obrigatoria para este tipo de evento.");

                var alreadyScored = await _context.PointEvents.AnyAsync(pointEvent =>
                    pointEvent.RE == re &&
                    pointEvent.EventType == eventType &&
                    pointEvent.ReferenceId == referenceId);

                if (alreadyScored)
                    throw new PointsRegistrationException("Pontuacao ja registrada para este RE, evento e referencia.", isConflict: true);
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

            return new RegisterPointsResponseDto
            {
                Points = points,
                EventType = eventType,
                RE = re,
                Message = "Pontuacao registrada com sucesso."
            };

        }

        public async Task<IEnumerable<RankingDto>> GetRankingAsync(int limit)
        {
            limit = Math.Clamp(limit, 1, 500);

            var ranking = await _context.PointEvents
                .AsNoTracking()
                .GroupBy(pointEvent => pointEvent.RE)
                .Select(group => new
                {
                    RE = group.Key,
                    TotalPoints = group.Sum(pointEvent => pointEvent.Points),
                    TotalEvents = group.Count()
                })
                .Join(
                    _context.Players.AsNoTracking(),
                    group => group.RE,
                    player => player.RE,
                    (group, player) => new RankingDto
                    {
                        RE = group.RE,
                        Name = player.Name,
                        Sector = player.Sector,
                        LastAccess = player.LastAccess,
                        TotalPoints = group.TotalPoints,
                        TotalEvents = group.TotalEvents
                    })
                .OrderByDescending(item => item.TotalPoints)
                .ThenBy(item => item.Name)
                .Take(limit)
                .ToListAsync();

            return ranking;
        }

        public async Task<IEnumerable<PointEventResponseDto>> GetEventsAsync(string? re, string? eventType, string? referenceId, int page, int pageSize)
        {
            PaginationLimits.Normalize(ref page, ref pageSize);

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

            return events;
        }

        public async Task<IEnumerable<PointRuleDto>> GetRulesAsync()
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

            return rules;
        }

        public async Task<PointRuleDto?> UpdateRuleAsync(int id, UpdatePointRuleDto dto)
        {
            if (dto.Points < 0 || dto.Bonus < 0)
                throw new ArgumentException("Pontos e bonus nao podem ser negativos.");

            var rule = await _context.PointRules.FindAsync(id);

            if (rule == null)
                return null;

            rule.Points = dto.Points;
            rule.BonusPoints = dto.Bonus;
            rule.IsActive = dto.IsActive;
            rule.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new PointRuleDto
            {
                Id = rule.Id,
                EventType = rule.EventType,
                Difficulty = rule.Difficulty,
                Points = rule.Points,
                BonusPoints = rule.BonusPoints,
                IsActive = rule.IsActive
            };
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
