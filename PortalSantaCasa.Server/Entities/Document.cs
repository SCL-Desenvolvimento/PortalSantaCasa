namespace PortalSantaCasa.Server.Entities
{
    public class Document
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public int? ParentId { get; set; }
        public string? FileUrl { get; set; }
        public string? FileName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

}
