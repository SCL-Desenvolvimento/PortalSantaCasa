namespace PortalSantaCasa.Server.Entities
{
    public class PublicAccessLog
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string RE { get; set; } = null!;
        [System.ComponentModel.DataAnnotations.RegularExpression("^(CLT|PJ)$")]
        [System.ComponentModel.DataAnnotations.StringLength(3)]
        public string EmploymentType { get; set; } = "CLT";
        public string Sector { get; set; } = null!;
        public string Page { get; set; } = null!;
        public DateTimeOffset AccessedAt { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
    }
}
