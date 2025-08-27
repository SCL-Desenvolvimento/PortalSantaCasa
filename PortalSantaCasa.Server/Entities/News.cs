namespace PortalSantaCasa.Server.Entities
{
    public class News
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
        public string? Summary { get; set; }
        public string? Content { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsQualityMinute { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }

        // Relação obrigatória com usuário
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        public ICollection<Banner> Banners { get; set; } = new List<Banner>();
    }
}
