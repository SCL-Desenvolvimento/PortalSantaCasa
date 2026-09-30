using System.ComponentModel.DataAnnotations;

namespace PortalSantaCasa.Server.Entities;

public class Benefit
{
    public int Id { get; set; }
    [MaxLength(160)] public string Title { get; set; } = "";
    [MaxLength(4000)] public string Description { get; set; } = "";
    [MaxLength(100)] public string Category { get; set; } = "";
    [MaxLength(500)] public string Eligibility { get; set; } = "";
    [MaxLength(2000)] public string HowToAccess { get; set; } = "";
    [MaxLength(1000)] public string? Link { get; set; }
    public bool IsActive { get; set; } = true;
}
