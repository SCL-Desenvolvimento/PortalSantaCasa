namespace PortalSantaCasa.Server.DTOs
{
    public class CourseViewDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string VideoUrl { get; set; }
        public string CreatorName { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<int> AssignedUserIds { get; set; } = new List<int>();
    }

    public class MarkAsWatchedDto
    {
        public int UserId { get; set; }
        public int CourseId { get; set; }
    }

    public class CourseCreationDto
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string VideoUrl { get; set; }
        public int CreatorId { get; set; }
        public List<int> AssignedUserIds { get; set; } // IDs dos usuários para atribuir o curso
    }

    public class CourseTrackingDto
    {
        public int CourseId { get; set; }
        public string CourseTitle { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; }
        public bool IsWatched { get; set; }
        public DateTime? WatchedAt { get; set; }
    }
}
