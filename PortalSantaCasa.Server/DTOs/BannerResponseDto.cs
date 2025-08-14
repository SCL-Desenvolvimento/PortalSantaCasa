namespace PortalSantaCasa.Server.DTOs
{
    public class BannerResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string ImageUrl { get; set; }
        public int Order { get; set; }
        public int TimeSeconds { get; set; }
        public bool IsActive { get; set; }
        public int? NewsId { get; set; }
    }
}
