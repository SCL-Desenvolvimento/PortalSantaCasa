namespace PortalSantaCasa.Server.DTOs
{
    public class FormsCreateDto
    {
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string? FormsLink { get; set; }
    }
    public class FormsUpdateDto
    {
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string? FormsLink { get; set; }
    }

    public class FormsResponseDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string? FormsLink { get; set; }
    }
}