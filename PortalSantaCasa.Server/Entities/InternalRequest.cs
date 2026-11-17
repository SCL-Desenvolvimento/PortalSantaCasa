namespace PortalSantaCasa.Server.Entities;

public sealed class InternalRequest
{
    public int Id { get; set; }
    public int RequesterId { get; set; }
    public required string RequesterName { get; set; }
    public required string ServiceCode { get; set; }
    public required string ServiceName { get; set; }
    public required string Department { get; set; }
    public required string Status { get; set; }
    public DateOnly? DueDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public int Version { get; set; }
    public ICollection<InternalRequestEvent> History { get; set; } = new List<InternalRequestEvent>();
}

public sealed class InternalRequestEvent
{
    public int InternalRequestId { get; set; }
    public int Version { get; set; }
    public Guid OperationId { get; set; }
    public int ActorId { get; set; }
    public required string ActorName { get; set; }
    public required string Status { get; set; }
    public DateOnly? DueDate { get; set; }
    public string? Reply { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
