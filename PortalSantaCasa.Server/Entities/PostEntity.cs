using PortalSantaCasa.Server.Enums;
using System.ComponentModel.DataAnnotations;

namespace PortalSantaCasa.Server.Entities
{
    public class PostEntity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(500)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(4000)]
        public string Message { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? ImageUrl { get; set; }

        [MaxLength(255)]
        public string? ImageFileName { get; set; }

        [Required]
        public string[]? Providers { get; set; } // JSON serialized array

        public PostStatus Status { get; set; } = PostStatus.Draft;

        public DateTime? ScheduledAtUtc { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime? PublishedAtUtc { get; set; }

        [MaxLength(2000)]
        public string? ErrorMessage { get; set; }

        [MaxLength(100)]
        public string? CreatedByUserId { get; set; }

        // Campos para rastreamento de publicação por provider
        [MaxLength(1000)]
        public string? FacebookPostId { get; set; }

        [MaxLength(1000)]
        public string? InstagramPostId { get; set; }

        [MaxLength(1000)]
        public string? LinkedInPostId { get; set; }

        // Metadados adicionais
        [MaxLength(2000)]
        public Dictionary<string, object>? Metadata { get; set; } // JSON para dados extras

        public int RetryCount { get; set; } = 0;
        public DateTime? LastRetryAtUtc { get; set; }

        // Navigation properties para auditoria
        public virtual ICollection<PostPublishLog> PublishLogs { get; set; } = new List<PostPublishLog>();

    }
}
