using System.ComponentModel.DataAnnotations;
using PortalSantaCasa.Server.Security;

namespace PortalSantaCasa.Server.DTOs;

public sealed class DepartmentContactInput
{
    [Required, StringLength(160)] public string Title { get; set; } = string.Empty;
    [Required, StringLength(120)] public string Department { get; set; } = string.Empty;
    [RegularExpression(@"^[+0-9(). -]*$"), StringLength(30)] public string? Extension { get; set; }
    [StringLength(160)] public string? Hours { get; set; }
    [StringLength(300)] public string? Keywords { get; set; }
    [StringLength(1000), HttpUrl] public string? ChannelUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public int Revision { get; set; }
}

public sealed record DepartmentContactView(int Id, string Title, string Department, string Extension, string Hours,
    string Keywords, string ChannelUrl, bool IsActive, DateTimeOffset UpdatedAt, bool CanEdit, int Revision);
