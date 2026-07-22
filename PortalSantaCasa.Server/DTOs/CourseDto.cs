namespace PortalSantaCasa.Server.DTOs
{
    public class CourseViewDto
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string VideoUrl { get; set; }
        public string ContentUrl => VideoUrl;
        public string ContentType { get; set; } = "video";
        public string? OriginalFileName { get; set; }
        public int CreatorId { get; set; }
        public string CreatorName { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public bool IsWatched { get; set; }
        public int ProgressPercentage { get; set; }
        public double LastPositionSeconds { get; set; }
        public DateTimeOffset? FirstAccessedAt { get; set; }
        public DateTimeOffset? LastAccessedAt { get; set; }
        public List<int> AssignedUserIds { get; set; } = new List<int>();
        public List<string> AssignedDepartments { get; set; } = new();
    }

    public class MarkAsWatchedDto
    {
        public int UserId { get; set; }
        public int CourseId { get; set; }
    }

    public class CourseProgressDto
    {
        public int CourseId { get; set; }
        public int ProgressPercentage { get; set; }
        public double PositionSeconds { get; set; }
        public double DurationSeconds { get; set; }
        public int CurrentPage { get; set; }
        public int TotalPages { get; set; }
        public int ActivitySeconds { get; set; }
        public bool Completed { get; set; }
    }

    public class CourseCreationDto
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public IFormFile? File { get; set; }
        public int CreatorId { get; set; }
        public List<int> AssignedUserIds { get; set; } = new(); // Pode atribuir somente por setor.
        public List<string> AssignedDepartments { get; set; } = new();
        public string ContentType { get; set; } = "video";
    }

    public class CourseTrackingDto
    {
        public int CourseId { get; set; }
        public string CourseTitle { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; }
        public string? Department { get; set; }
        public string ContentType { get; set; } = "video";
        public bool IsWatched { get; set; }
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
