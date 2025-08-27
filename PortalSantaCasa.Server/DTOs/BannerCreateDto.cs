namespace PortalSantaCasa.Server.DTOs
{
    public class BannerCreateDto
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public IFormFile File { get; set; }
        public int Order { get; set; }
        public int TimeSeconds { get; set; }
        public bool IsActive { get; set; }
        public int? NewsId { get; set; }
    }
}
