namespace PortalSantaCasa.Server.DTOs
{
    public class RegisterPointsDto
    {
        public string Name { get; set; } = null!;
        public string RE { get; set; } = null!;
        public string? Sector { get; set; }
        public string EventType { get; set; } = null!;
        public string? Difficulty { get; set; }
        public string? ReferenceId { get; set; }
        public string? ReferenceTitle { get; set; }
        public int? TimeSeconds { get; set; }
    }

    public class PointEventResponseDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string RE { get; set; } = null!;
        public string? Sector { get; set; }
        public string EventType { get; set; } = null!;
        public string? Difficulty { get; set; }
        public string? ReferenceId { get; set; }
        public string? ReferenceTitle { get; set; }
        public int Points { get; set; }
        public int? TimeSeconds { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class RegisterPointsResponseDto
    {
        public int Points { get; set; }
        public string EventType { get; set; } = null!;
        public string RE { get; set; } = null!;
        public string Message { get; set; } = null!;
    }

    public class RankingDto
    {
        public string RE { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Sector { get; set; }
        public int TotalPoints { get; set; }
        public int TotalEvents { get; set; }
        public DateTime? LastAccess { get; set; }
    }

    public class PointRuleDto
    {
        public int Id { get; set; }
        public string EventType { get; set; } = null!;
        public string? Difficulty { get; set; }
        public int Points { get; set; }
        public int BonusPoints { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdatePointRuleDto
    {
        public int Points { get; set; }
        public int Bonus { get; set; }
        public bool IsActive { get; set; }
    }
}
