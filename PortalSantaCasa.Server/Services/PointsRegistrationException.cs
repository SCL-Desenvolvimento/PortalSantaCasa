namespace PortalSantaCasa.Server.Services;

public class PointsRegistrationException(string message, bool isConflict = false,
    string? eventType = null, string? difficulty = null) : Exception(message)
{
    public bool IsConflict { get; } = isConflict;
    public string? EventType { get; } = eventType;
    public string? Difficulty { get; } = difficulty;
}
