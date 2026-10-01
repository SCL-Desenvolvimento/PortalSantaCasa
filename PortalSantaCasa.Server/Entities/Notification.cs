namespace PortalSantaCasa.Server.Entities
{
    public class Notification
    {
        public int Id { get; set; }
        public string Type { get; set; } = string.Empty; // "news", "birthday", "event", "document"
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public string Link { get; set; } = string.Empty; // Optional link to content
        public DateTimeOffset? NotificationDate { get; set; } // data do evento, menu ou aniversariante

        public bool IsGlobal { get; set; } // true = todos os usuários, false = destinatários específicos
        public string TargetDepartment { get; set; } = string.Empty;

        public ICollection<UserNotification> UserNotifications { get; set; } = [];

    }
}
