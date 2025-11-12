namespace PortalSantaCasa.Server.Entities
{
    public class Chat
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!; // Nome do chat (para grupos) ou nome do outro usuário (para conversas 1:1)
        public string? AvatarUrl { get; set; } // URL do avatar/ícone do chat
        public bool IsGroup { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Propriedades de navegação
        public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
        public ICollection<ChatParticipant> Participants { get; set; } = new List<ChatParticipant>();
    }
}
