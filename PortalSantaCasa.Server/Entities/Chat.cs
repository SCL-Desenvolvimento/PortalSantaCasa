namespace PortalSantaCasa.Server.Entities
{
    public class Chat
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!; // Nome do chat (para grupos) ou nome do outro usuário (para conversas 1:1)
        public string? AvatarUrl { get; set; } // URL do avatar/ícone do chat
        public bool IsGroup { get; set; } = false;
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

        // Propriedades de navegação
        public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
        public ICollection<ChatParticipant> Participants { get; set; } = new List<ChatParticipant>();
    }
}
