using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class NotificationCreateDto
    {
        [Required] [StringLength(160)]
        public string Type { get; set; } = string.Empty;
        [Required] [StringLength(160)]
        public string Title { get; set; } = string.Empty;
        [Required] [StringLength(10000)]
        public string Message { get; set; } = string.Empty;
        [Required] [StringLength(2000)]
        public string Link { get; set; } = string.Empty;
        public bool IsGlobal { get; set; } = true;
        [StringLength(160)]
        public string TargetDepartment { get; set; } = string.Empty;
        public DateTimeOffset? NotificationDate { get; set; }
    }
    public class NotificationResponseDto
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty; // news, event, menu, birthday, etc.
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Link { get; set; } = string.Empty;
        public bool IsRead { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? NotificationDate { get; set; } // data do evento, menu ou aniversariante
    }
}
