namespace PortalSantaCasa.Server.Entities
{
    public class Course
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string VideoUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
       
        public int CreatorId { get; set; } // ID do usuário que criou o curso
        public User Creator { get; set; }

        // Relacionamentos
        public ICollection<UserCourse> AssignedUsers { get; set; }
    }
}
