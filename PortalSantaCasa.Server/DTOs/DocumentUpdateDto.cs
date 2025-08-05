namespace PortalSantaCasa.Server.DTOs
{
    public class DocumentUpdateDto
    {
        public string Name { get; set; } = null!;
        public int? ParentId { get; set; }
        public IFormFile? File { get; set; }
        public bool IsActive { get; set; }
    }
}
