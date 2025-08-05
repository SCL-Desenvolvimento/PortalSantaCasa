namespace PortalSantaCasa.Server.DTOs
{
    public class StatsDto
    {
        public int NewsCount { get; set; }
        public int DocumentsCount { get; set; }
        public int BirthdaysCount { get; set; }
        public int UsersCount { get; set; }

        public List<FeedbackResponseDto> RecentFeedbacks { get; set; } = new();
    }
}
