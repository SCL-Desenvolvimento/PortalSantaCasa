using PortalSantaCasa.Server.Entities;

namespace PortalSantaCasa.Server.DTOs
{
    public class Stats
    {
        public int NewsCount { get; set; }
        public int DocumentsCount { get; set; }
        public int BirthdaysCount { get; set; }
        public int UsersCount { get; set; }
        public List<Feedback> RecentFeedbacks { get; set; } = new();
    }

}
