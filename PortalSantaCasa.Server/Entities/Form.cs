namespace PortalSantaCasa.Server.Entities
{
    public class Form
    {
        public int Id { get; set; }
        public string Title { get; set; } = null!;
        public string Description { get; set; } = string.Empty;
        public string FormsLink { get; set; } = string.Empty;
    }
}
