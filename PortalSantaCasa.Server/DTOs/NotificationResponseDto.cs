namespace PortalSantaCasa.Server.DTOs
{
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
