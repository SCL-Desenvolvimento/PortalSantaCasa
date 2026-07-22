namespace PortalSantaCasa.Server.Entities
{
    public class UserCourse
    {
        public int UserId { get; set; }
        public User User { get; set; }

        public int CourseId { get; set; }
        public Course Course { get; set; }

        public bool IsWatched { get; set; } = false;
        public DateTimeOffset? WatchedAt { get; set; }
        public int ProgressPercentage { get; set; }
        public double LastPositionSeconds { get; set; }
        public double TotalDurationSeconds { get; set; }
        public int CurrentPage { get; set; }
        public int TotalPages { get; set; }
        public int TimeSpentSeconds { get; set; }
        public DateTimeOffset? FirstAccessedAt { get; set; }
        public DateTimeOffset? LastAccessedAt { get; set; }
    }
}
