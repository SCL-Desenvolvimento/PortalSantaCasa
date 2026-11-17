using System.ComponentModel.DataAnnotations;

namespace PortalSantaCasa.Server.Entities;

public sealed class DepartmentContact
{
    public int Id { get; set; }
    [MaxLength(160)] public string Title { get; set; } = string.Empty;
    [MaxLength(120)] public string Department { get; set; } = string.Empty;
    [MaxLength(64)] public string DepartmentKey { get; set; } = string.Empty;
    [MaxLength(30)] public string Extension { get; set; } = string.Empty;
    [MaxLength(160)] public string Hours { get; set; } = string.Empty;
    [MaxLength(300)] public string Keywords { get; set; } = string.Empty;
    [MaxLength(1000)] public string ChannelUrl { get; set; } = string.Empty;
    [MaxLength(700)] public string SearchText { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    [ConcurrencyCheck] public int Revision { get; set; }
}
