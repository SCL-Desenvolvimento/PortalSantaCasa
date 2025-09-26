namespace PortalSantaCasa.Server.Entities
{
    public class SocialAccount
    {
        public int Id { get; set; }
        public string Provider { get; set; }
        public string AccountId { get; set; }
        public string? AccessToken { get; set; }
        public string? RefreshToken { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
