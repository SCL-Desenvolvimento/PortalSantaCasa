using System.ComponentModel.DataAnnotations;

namespace PortalSantaCasa.Server.DTOs;

public class BenefitDto : IValidatableObject
{
    [Required, StringLength(160)] public string Title { get; set; } = "";
    [Required, StringLength(4000)] public string Description { get; set; } = "";
    [StringLength(100)] public string Category { get; set; } = "";
    [StringLength(500)] public string Eligibility { get; set; } = "";
    [StringLength(2000)] public string HowToAccess { get; set; } = "";
    [StringLength(1000)] public string? Link { get; set; }
    public bool IsActive { get; set; } = true;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!string.IsNullOrWhiteSpace(Link) &&
            (!Uri.TryCreate(Link.Trim(), UriKind.Absolute, out var uri) ||
             (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp)))
            yield return new ValidationResult("Informe um link HTTP ou HTTPS válido.", new[] { nameof(Link) });
    }
}
