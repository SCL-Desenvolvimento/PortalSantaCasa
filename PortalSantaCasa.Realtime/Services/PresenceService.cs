using StackExchange.Redis;

namespace PortalSantaCasa.Realtime.Services;

public class PresenceService
{
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
            await _redis.StringSetAsync(
                $"presence:user:{userId}",
                userId.ToString(),
                TimeSpan.FromMinutes(2));
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
            var server = GetServer();

            var keys = server
                .Keys(pattern: "presence:user:*")
                .ToArray();

            var users = new List<object>();

            foreach (var key in keys)
            {
                var value = await _redis.StringGetAsync(key);

                if (int.TryParse(value, out var userId))
                {
                    users.Add(new
                    {
                        id = userId,
                        userName = $"Usuário {userId}"
                    });
                }
            }

            return users;
        }
        catch (Exception exception) when (exception is RedisException or InvalidOperationException)
        {
            _logger.LogWarning(exception, "Redis indisponível ao consultar usuários online.");
            return [];
        }
    }

    private IServer GetServer()
    {
        var multiplexer = _redis.Multiplexer;
        var endpoint = multiplexer.GetEndPoints().First();

        return multiplexer.GetServer(endpoint);
    }
}
