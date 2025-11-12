namespace PortalSantaCasa.Server.Entities
{
    public class ChatMessage
    {
        public int Id { get; set; }
        public int ChatId { get; set; }
        public int SenderId { get; set; }
        public string Content { get; set; } = null!;
        public DateTime SentAt { get; set; } = DateTime.UtcNow;

        // Navegação
        public Chat Chat { get; set; } = null!;
        public User Sender { get; set; } = null!;
    }

}
