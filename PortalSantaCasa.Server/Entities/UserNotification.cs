namespace PortalSantaCasa.Server.Entities
{
    public class UserNotification
    {
        public int Id { get; set; }

        public int NotificationId { get; set; }
        public Notification Notification { get; set; }

        public int UserId { get; set; }
        public User User { get; set; }

        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

}
