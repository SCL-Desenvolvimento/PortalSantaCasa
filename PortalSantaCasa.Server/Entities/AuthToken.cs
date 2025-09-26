using System.ComponentModel.DataAnnotations;

namespace PortalSantaCasa.Server.Entities
{
    public class AuthToken
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Provider { get; set; } = string.Empty; // "facebook", "instagram", "linkedin"

        [Required]
        [MaxLength(100)]
        public string AccountId { get; set; } = string.Empty; // page_id, organization_id, etc.

        [MaxLength(100)]
        public string? AccountName { get; set; }

        [Required]
        [MaxLength(2000)]
        public string AccessToken { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string? RefreshToken { get; set; }

        public DateTime ExpiresAtUtc { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? LastRefreshedAtUtc { get; set; }

        [MaxLength(500)]
        public string[]? Scopes { get; set; }

        public bool IsActive { get; set; } = true;

        [MaxLength(1000)]
        public string? ErrorMessage { get; set; }

        public int RefreshAttempts { get; set; } = 0;

        // Metadados específicos do provider
        [MaxLength(2000)]
        public Dictionary<string, object>? ProviderMetadata { get; set; }

    }
}
