namespace PortalSantaCasa.Server.Entities
{
    public class Course
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string VideoUrl { get; set; }
        public string ContentType { get; set; } = "video";
        public string? OriginalFileName { get; set; }
        public string? AssignedDepartments { get; set; }
        public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
       
        public int CreatorId { get; set; } // ID do usuário que criou o curso
        public User Creator { get; set; }

        // Relacionamentos
        public ICollection<UserCourse> AssignedUsers { get; set; }
    }
}
