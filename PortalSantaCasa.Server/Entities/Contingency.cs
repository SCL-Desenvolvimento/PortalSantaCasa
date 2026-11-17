using System.ComponentModel.DataAnnotations;

namespace PortalSantaCasa.Server.Entities;

public sealed class Contingency
{
    public int Id { get; set; }
    [MaxLength(160)] public string System { get; set; } = string.Empty;
    public string DepartmentsJson { get; set; } = "[]";
    [MaxLength(30)] public string Extension { get; set; } = string.Empty;
    [MaxLength(6000)] public string Procedure { get; set; } = string.Empty;
    [MaxLength(20)] public string Status { get; set; } = "investigating";
    public DateTimeOffset? NextUpdateAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    [ConcurrencyCheck] public int Revision { get; set; } = 1;
    public ICollection<ContingencyUpdate> Updates { get; set; } = [];
}

public sealed class ContingencyUpdate
{
    public int Id { get; set; }
    public int ContingencyId { get; set; }
    [MaxLength(20)] public string Status { get; set; } = string.Empty;
    [MaxLength(2000)] public string Message { get; set; } = string.Empty;
    [MaxLength(255)] public string Author { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}
