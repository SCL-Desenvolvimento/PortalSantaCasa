namespace PortalSantaCasa.Server.Entities
{
    public class Feedback
    {
        public int Id { get; set; }

        // Quem envia
        public string Name { get; set; } = null!;
        public string? Email { get; set; }
        public string? Department { get; set; }

        public string Category { get; set; } = null!;
        // Para quem vai
        public string TargetDepartment { get; set; }
        public string Subject { get; set; } = null!;
        public string Message { get; set; } = null!;
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ReadAt { get; set; }
    }
}
