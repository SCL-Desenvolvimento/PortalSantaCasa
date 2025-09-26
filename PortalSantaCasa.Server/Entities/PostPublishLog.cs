using PortalSantaCasa.Server.Enums;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PortalSantaCasa.Server.Entities
{
    public class PostPublishLog
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int PostId { get; set; }

        [ForeignKey("PostId")]
        public virtual PostEntity Post { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string Provider { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Action { get; set; } = string.Empty; // "publish", "schedule", "retry", "cancel"

        [Required]
        public PostStatus Status { get; set; } // "success", "failed", "pending"

        [MaxLength(2000)]
        public string? Message { get; set; }

        [MaxLength(1000)]
        public string? ExternalPostId { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        [MaxLength(4000)]
        public string? RequestData { get; set; } // JSON dos dados enviados

        [MaxLength(4000)]
        public string? ResponseData { get; set; } // JSON da resposta recebida

    }
}
