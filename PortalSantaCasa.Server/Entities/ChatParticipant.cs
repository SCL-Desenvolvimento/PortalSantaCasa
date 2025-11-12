namespace PortalSantaCasa.Server.Entities
{
    public class ChatParticipant
    {
        public int ChatId { get; set; }
        public int UserId { get; set; }
        public bool IsAdmin { get; set; } = false; // Apenas para grupos
        public bool IsMuted { get; set; } = false;
        public DateTime LastReadMessageAt { get; set; } = DateTime.MinValue;
        public bool IsDeleted { get; set; } = false; // Para "excluir" o chat da lista do usuário

        // Propriedades de navegação
        public Chat Chat { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
