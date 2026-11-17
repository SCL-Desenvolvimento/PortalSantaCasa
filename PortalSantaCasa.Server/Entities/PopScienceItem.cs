namespace PortalSantaCasa.Server.Entities;

public sealed class PopScienceItem
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Kind { get; set; } = null!;
    public string Department { get; set; } = null!;
    public string DepartmentKey { get; set; } = null!;
    public string ManagementDepartmentKey { get; set; } = null!;
}

public sealed class PopScienceVersion
{
    public int Id { get; set; }
    public int ItemId { get; set; }
    public PopScienceItem Item { get; set; } = null!;
    public int Number { get; set; }
    public string Owner { get; set; } = null!;
    public string ReleaseNote { get; set; } = null!;
    public DateOnly ReviewDate { get; set; }
    public DateOnly? AcknowledgementDeadline { get; set; }
    public DateTimeOffset PublishedAt { get; set; }
    public int PublishedByUserId { get; set; }
    public string PublishedByName { get; set; } = null!;
    public string? FileKey { get; set; }
    public string? FileName { get; set; }
    public string? Body { get; set; }
    public ICollection<PopScienceReceipt> Receipts { get; set; } = [];
}

public sealed class PopScienceReceipt
{
    public int VersionId { get; set; }
    public int UserId { get; set; }
    public string Username { get; set; } = null!;
    public DateTimeOffset? ConfirmedAt { get; set; }
}
