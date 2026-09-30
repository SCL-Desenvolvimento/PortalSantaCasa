using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class NotificationCreateDto
    {
        [Required] [StringLength(160)]
        public string Type { get; set; }
        [Required] [StringLength(160)]
        public string Title { get; set; }
        [Required] [StringLength(10000)]
        public string Message { get; set; }
        [Required] [StringLength(2000)]
        public string Link { get; set; }
        public bool IsGlobal { get; set; } = true;
        [StringLength(160)]
        public string TargetDepartment { get; set; } = string.Empty;
        public DateTimeOffset? NotificationDate { get; set; }
    }
    public class NotificationResponseDto
    {
        public int Id { get; set; }
        public string Type { get; set; } // news, event, menu, birthday, etc.
        public string Title { get; set; }
        public string Message { get; set; }
        public string Link { get; set; }
        public bool IsRead { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? NotificationDate { get; set; } // data do evento, menu ou aniversariante
    }
}
