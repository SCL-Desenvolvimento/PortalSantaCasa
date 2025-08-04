namespace PortalSantaCasa.Server.DTOs
{
    public class DocumentCreateDto
    {
        public string Name { get; set; } = null!;
        public int? ParentId { get; set; }
        public string? FileUrl { get; set; }
        public string? FileName { get; set; }
        public bool IsActive { get; set; }
    }
}
