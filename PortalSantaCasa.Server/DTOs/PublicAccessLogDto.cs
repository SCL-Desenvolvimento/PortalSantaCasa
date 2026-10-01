using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class PublicAccessLogCreateDto
    {
        [StringLength(160)]
        public string? Name { get; set; }
        [Required] [StringLength(160)]
        public string RE { get; set; } = null!;
        [StringLength(160)]
        public string? Sector { get; set; }
        [Required] [StringLength(160)]
        public string Page { get; set; } = null!;
        public int? ContentId { get; set; }
        [StringLength(100000)]
        public string? ContentTitle { get; set; }
    }

    public class PublicAccessLogResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string RE { get; set; } = null!;
        public string Sector { get; set; } = null!;
        public string Page { get; set; } = null!;
        public int? ContentId { get; set; }
        public string? ContentTitle { get; set; }
        public DateTimeOffset AccessedAt { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
    }

    public class PublicAccessLogContentOptionDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
    }

    public class PublicAccessLogReportQueryDto
    {
        public string? PageType { get; set; }
        public DateTimeOffset? StartDate { get; set; }
        public DateTimeOffset? EndDate { get; set; }
        public string? Sector { get; set; }
        public int? ContentId { get; set; }
        public int CurrentPage { get; set; } = 1;
        public int PerPage { get; set; } = 50;
    }

    public class PublicAccessLogReportDto
    {
        public int CurrentPage { get; set; }
        public int PerPage { get; set; }
        public int Total { get; set; }
        public int Pages { get; set; }
        public IEnumerable<PublicAccessLogResponseDto> Logs { get; set; } = [];
    }
}
