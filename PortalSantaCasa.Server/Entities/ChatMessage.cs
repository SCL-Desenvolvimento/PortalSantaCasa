namespace PortalSantaCasa.Server.Entities
{
    public class ChatMessage
    {
        public int Id { get; set; }
        public int ChatId { get; set; }
        public int SenderId { get; set; }
        public int MessageType { get; set; } // 0: Normal, 1: System
        public int? SystemEventType { get; set; } // 0: UserRemoved, 1: UserAdded
        public int? TargetUserId { get; set; }
        public int? RemovedByUserId { get; set; }
        public int? AddedByUserId { get; set; }
        public string? Content { get; set; }
        public DateTimeOffset SentAt { get; set; } = DateTimeOffset.UtcNow;

        public ChatMessageFile? File { get; set; }
        public Chat Chat { get; set; } = null!;
        public User Sender { get; set; } = null!;
    }

}
