namespace PortalSantaCasa.Server.DTOs;

public sealed record CreateInternalRequestDto(string ServiceCode, Guid OperationId);

public sealed record UpdateInternalRequestDto(
    int Version, Guid OperationId, string Status, DateOnly? DueDate, string? Reply);

public sealed record InternalRequestServiceDto(string Code, string Name, string Department);

public sealed record InternalRequestCatalogDto(bool CanManage, IReadOnlyList<InternalRequestServiceDto> Services);

public sealed record InternalRequestSummaryDto(
    int Id, string Protocol, string ServiceName, string Department, string RequesterName,
    string Status, DateOnly? DueDate, DateTimeOffset CreatedAt, int Version);

public sealed record InternalRequestEventDto(
    int Version, string ActorName, string Status, DateOnly? DueDate, string? Reply, DateTimeOffset CreatedAt);

public sealed record InternalRequestDetailDto(
    InternalRequestSummaryDto Request, IReadOnlyList<InternalRequestEventDto> History);

public sealed record InternalRequestPageDto(IReadOnlyList<InternalRequestSummaryDto> Items, bool HasMore);
