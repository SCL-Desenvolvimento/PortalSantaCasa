namespace PortalSantaCasa.Server.Entities;

public class CourseCompletion
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int CourseId { get; set; }
    public Guid CycleId { get; set; }
    public DateTimeOffset? AssignedAt { get; set; }
    public DateTimeOffset? DueAt { get; set; }
    public DateTimeOffset CompletedAt { get; set; }
    public int TimeSpentSeconds { get; set; }
    public UserCourse Assignment { get; set; } = null!;
}
