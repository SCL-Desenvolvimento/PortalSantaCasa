namespace PortalSantaCasa.Server.Entities
{
    public class ChatParticipant
    {
        public int ChatId { get; set; }
        public int UserId { get; set; }
        public bool IsAdmin { get; set; } = false; // Apenas para grupos
        public bool IsMuted { get; set; } = false;
        public DateTimeOffset LastReadMessageAt { get; set; } = DateTime.MinValue;
        public bool IsDeleted { get; set; } = false; // Indica se o chat foi "excluído" (ocultado) pelo usuário

        // Propriedades de navegação
        public Chat Chat { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}
