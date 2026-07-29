namespace PortalSantaCasa.Server.DTOs
{
    public class StatsDto
    {
        public int NewsCount { get; set; }
        public int DocumentsCount { get; set; }
        public int BirthdaysCount { get; set; }
        public int UsersCount { get; set; }
        public decimal? NewsTrend { get; set; }
        public decimal? DocumentsTrend { get; set; }
        public decimal? BirthdaysTrend { get; set; }
        public decimal? UsersTrend { get; set; }

        public List<FeedbackResponseDto> RecentFeedbacks { get; set; } = new();
    }
}
