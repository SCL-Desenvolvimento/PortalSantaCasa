using StackExchange.Redis;

namespace PortalSantaCasa.Realtime.Services;

public class PresenceService
{
    private const string PresenceKey = "presence:users";
    private static readonly TimeSpan PresenceLifetime = TimeSpan.FromMinutes(2);
    private readonly IDatabase _redis;
    private readonly ILogger<PresenceService> _logger;

    public PresenceService(IConnectionMultiplexer redis, ILogger<PresenceService> logger)
    {
        _redis = redis.GetDatabase();
        _logger = logger;
    }

    public async Task HeartbeatAsync(int userId)
    {
        try
        {
            var expiresAt = DateTimeOffset.UtcNow
                .Add(PresenceLifetime)
                .ToUnixTimeMilliseconds();

            await _redis.SortedSetAddAsync(PresenceKey, userId, expiresAt);
        }
        catch (RedisException exception)
        {
            _logger.LogWarning(exception, "Redis indisponível ao atualizar a presença do usuário {UserId}.", userId);
        }
    }

    public async Task<List<object>> GetOnlineUsersAsync()
    {
        try
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

            await _redis.SortedSetRemoveRangeByScoreAsync(
                PresenceKey,
                double.NegativeInfinity,
                now);

            var onlineUserIds = await _redis.SortedSetRangeByScoreAsync(
                PresenceKey,
                now,
                double.PositiveInfinity);

            return onlineUserIds
                .Select(value => int.TryParse(value.ToString(), out var userId) ? userId : (int?)null)
                .Where(userId => userId.HasValue)
                .Select(userId => (object)new
                {
                    id = userId!.Value,
                    userName = $"Usuário {userId.Value}"
                })
                .ToList();
        }
        catch (Exception exception) when (exception is RedisException or InvalidOperationException)
        {
            _logger.LogWarning(exception, "Redis indisponível ao consultar usuários online.");
            return [];
        }
    }
}
