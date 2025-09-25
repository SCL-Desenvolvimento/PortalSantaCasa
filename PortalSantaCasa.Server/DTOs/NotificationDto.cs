namespace PortalSantaCasa.Server.DTOs
{
    public class NotificationCreateDto
    {
        public string Type { get; set; }
        public string Title { get; set; }
        public string Message { get; set; }
        public string Link { get; set; }
        public bool IsGlobal { get; set; } = true;
        public string TargetDepartment { get; set; } = string.Empty;
        public DateTime? NotificationDate { get; set; }
    }
    public class NotificationResponseDto
    {
        public int Id { get; set; }
        public string Type { get; set; } // news, event, menu, birthday, etc.
        public string Title { get; set; }
        public string Message { get; set; }
        public string Link { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? NotificationDate { get; set; } // data do evento, menu ou aniversariante
    }
}
