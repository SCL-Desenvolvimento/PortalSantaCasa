namespace PortalSantaCasa.Server.DTOs
{
    public class PublicAccessLogCreateDto
    {
        public string Name { get; set; } = null!;
        public string RE { get; set; } = null!;
        public string Sector { get; set; } = null!;
        public string Page { get; set; } = null!;
    }

    public class PublicAccessLogResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string RE { get; set; } = null!;
        public string Sector { get; set; } = null!;
        public string Page { get; set; } = null!;
        public DateTimeOffset AccessedAt { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
    }
}
