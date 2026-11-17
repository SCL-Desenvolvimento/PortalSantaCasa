using System.ComponentModel.DataAnnotations;

namespace PortalSantaCasa.Server.DTOs;

public sealed class ContingencyCreateInput
{
    [Required, StringLength(160)] public string System { get; set; } = string.Empty;
    [Required, MinLength(1), MaxLength(100)] public string[] Departments { get; set; } = [];
    [Required, StringLength(30), RegularExpression(@"^[+0-9(). -]+$")] public string Extension { get; set; } = string.Empty;
    [Required, StringLength(6000)] public string Procedure { get; set; } = string.Empty;
    [Required, StringLength(2000)] public string Message { get; set; } = string.Empty;
    [Required] public DateTimeOffset? NextUpdateAt { get; set; }
}

public sealed class ContingencyUpdateInput
{
    [Range(1, int.MaxValue)] public int Revision { get; set; }
    [Required, RegularExpression("^(investigating|monitoring|resolved)$")] public string Status { get; set; } = string.Empty;
    [Required, StringLength(2000)] public string Message { get; set; } = string.Empty;
    public DateTimeOffset? NextUpdateAt { get; set; }
    [MinLength(1), MaxLength(100)] public string[]? Departments { get; set; }
    [StringLength(30), RegularExpression(@"^[+0-9(). -]+$")] public string? Extension { get; set; }
    [StringLength(6000)] public string? Procedure { get; set; }
}

public sealed record ContingencyView(int Id, string System, string[] Departments, string Extension, string Procedure,
    string Status, DateTimeOffset CreatedAt, DateTimeOffset? NextUpdateAt, int Revision, ContingencyUpdateView[] Updates);

public sealed record ContingencyUpdateView(string Status, string Message, string Author, DateTimeOffset CreatedAt);
