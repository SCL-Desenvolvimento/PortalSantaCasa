using System.ComponentModel.DataAnnotations;

namespace PortalSantaCasa.Server.DTOs;

public sealed class PopSciencePublishDto
{
    [StringLength(160)] public string? Title { get; set; }
    [StringLength(12)] public string? Kind { get; set; }
    [StringLength(160)] public string? Department { get; set; }
    [Required, StringLength(120)] public string Owner { get; set; } = null!;
    [Required, StringLength(1000)] public string ReleaseNote { get; set; } = null!;
    [Required] public DateOnly? ReviewDate { get; set; }
    public DateOnly? AcknowledgementDeadline { get; set; }
    public IFormFile? File { get; set; }
    [StringLength(12000)] public string? Body { get; set; }
}

public sealed record PopScienceModuleDto(string[] PublisherDepartments, PopScienceItemDto[] Items);

public sealed record PopScienceItemDto(
    int Id, string Title, string Kind, string Department, bool CanManage, bool CanTrack, PopScienceVersionDto[] Versions);

public sealed record PopScienceVersionDto(
    int Number, string Owner, string ReleaseNote, DateOnly ReviewDate, DateOnly? AcknowledgementDeadline,
    DateTimeOffset PublishedAt, string PublishedByName, string? FileName, string? Body, bool Assigned, DateTimeOffset? ConfirmedAt);

public sealed record PopSciencePublicationDto(int ItemId, int Number);

public sealed record PopScienceReceiptDto(int UserId, string Username, DateTimeOffset? ConfirmedAt);
