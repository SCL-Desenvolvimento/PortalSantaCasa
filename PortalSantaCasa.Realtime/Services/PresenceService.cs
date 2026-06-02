using StackExchange.Redis;

namespace PortalSantaCasa.Realtime.Services;

public class PresenceService
{
    private readonly IDatabase _redis;

    public PresenceService(IConnectionMultiplexer redis)
    {
        _redis = redis.GetDatabase();
    }

    public async Task HeartbeatAsync(int userId)
    {
        await _redis.StringSetAsync(
            $"presence:user:{userId}",
            userId.ToString(),
            TimeSpan.FromMinutes(2));
    }

    public async Task<List<object>> GetOnlineUsersAsync()
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

    private IServer GetServer()
    {
        var multiplexer = _redis.Multiplexer;
        var endpoint = multiplexer.GetEndPoints().First();

        return multiplexer.GetServer(endpoint);
    }
}