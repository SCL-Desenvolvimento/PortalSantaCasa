using System.ComponentModel.DataAnnotations;
namespace PortalSantaCasa.Server.DTOs
{
    public class CourseViewDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string VideoUrl { get; set; } = string.Empty;
        public string ContentUrl => VideoUrl;
        public string ContentType { get; set; } = "video";
        public string? OriginalFileName { get; set; }
        public int CreatorId { get; set; }
        public string CreatorName { get; set; } = string.Empty;
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
        [Required] [StringLength(160)]
        public string Title { get; set; } = string.Empty;
        [Required] [StringLength(10000)]
        public string Description { get; set; } = string.Empty;
        public IFormFile? File { get; set; }
        public int CreatorId { get; set; }
        public List<int> AssignedUserIds { get; set; } = new(); // Pode atribuir somente por setor.
        public List<string> AssignedDepartments { get; set; } = new();
        [Required] [StringLength(100000)]
        public string ContentType { get; set; } = "video";
    }

    public class CourseTrackingDto
    {
        public int CourseId { get; set; }
        public string CourseTitle { get; set; } = string.Empty;
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
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
