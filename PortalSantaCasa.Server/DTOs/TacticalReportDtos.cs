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
    TacticalReportPresentationDto Presentation,
    string? Message = null);

public sealed record TacticalReportPresentationDto(
    IReadOnlyList<TacticalMetricDto> Metrics,
    IReadOnlyList<TacticalChartDto> Charts,
    IReadOnlyList<TacticalInsightDto> Insights,
    IReadOnlyList<TacticalColumnDto> Columns,
    IReadOnlyList<TacticalFilterDto> Filters,
    IReadOnlyList<JsonElement> Rows);

public sealed record TacticalMetricDto(string Label, string Value, string Detail, string Tone, string Icon);
public sealed record TacticalChartPointDto(string Label, double Value, string Color);
public sealed record TacticalChartDto(string Title, string Type, IReadOnlyList<TacticalChartPointDto> Data);
public sealed record TacticalInsightDto(string Severity, string Title, string Description, string Recommendation);
public sealed record TacticalColumnDto(string Key, string Label, string Format = "text");
public sealed record TacticalFilterOptionDto(string Label, string Value);
public sealed record TacticalFilterDto(string Key, string Label, string Type, IReadOnlyList<TacticalFilterOptionDto> Options);
