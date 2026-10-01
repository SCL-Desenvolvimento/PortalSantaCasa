namespace PortalSantaCasa.Server.Entities
{
    public class UserNotification
    {
        public int Id { get; set; }

        public int NotificationId { get; set; }
        public Notification Notification { get; set; } = null!;

        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public bool IsRead { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    }

}
