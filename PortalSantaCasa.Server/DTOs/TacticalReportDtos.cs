using System.Text.Json;

namespace PortalSantaCasa.Server.DTOs;

public sealed record TacticalReportDefinitionDto(
    string Slug,
    string Title,
    string Category,
    string Description,
    string Icon,
    string[] Endpoints,
    bool RequiresAgent = false);

public sealed record TacticalReportResultDto(
    TacticalReportDefinitionDto Report,
    bool Configured,
    DateTimeOffset GeneratedAt,
    IReadOnlyList<JsonElement> Rows,
    IReadOnlyDictionary<string, int> Summary,
    string? Message = null);
