namespace PortalSantaCasa.Server.Entities
{
    public class Banner
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public int Order { get; set; }
        public int TimeSeconds { get; set; }
        public bool IsActive { get; set; }

        public int? NewsId { get; set; }
        public News? News { get; set; }
    }
}
