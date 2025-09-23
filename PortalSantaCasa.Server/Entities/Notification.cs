namespace PortalSantaCasa.Server.Entities
{
    public class Notification
    {
        public int Id { get; set; }
        public string Type { get; set; } // "news", "birthday", "event", "document"
        public string Title { get; set; }
        public string Message { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsRead { get; set; } = false;
        public string Link { get; set; } // Optional link to content
        public DateTime? NotificationDate { get; set; } // data do evento, menu ou aniversariante
    }
}
