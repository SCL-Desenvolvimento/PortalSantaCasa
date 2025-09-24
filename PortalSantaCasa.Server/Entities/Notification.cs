namespace PortalSantaCasa.Server.Entities
{
    public class Notification
    {
        public int Id { get; set; }
        public string Type { get; set; } // "news", "birthday", "event", "document"
        public string Title { get; set; }
        public string Message { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string Link { get; set; } // Optional link to content
        public DateTime? NotificationDate { get; set; } // data do evento, menu ou aniversariante

        public bool IsGlobal { get; set; } // true = todos os usuários, false = destinatários específicos
        public string TargetDepartment { get; set; } = string.Empty;

        public ICollection<UserNotification> UserNotifications { get; set; } = [];

    }
}
