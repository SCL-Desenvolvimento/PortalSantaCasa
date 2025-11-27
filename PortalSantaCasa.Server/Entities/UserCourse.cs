namespace PortalSantaCasa.Server.Entities
{
    public class UserCourse
    {
        public int UserId { get; set; }
        public User User { get; set; }

        public int CourseId { get; set; }
        public Course Course { get; set; }

        public bool IsWatched { get; set; } = false;
        public DateTime? WatchedAt { get; set; }
    }
}
