namespace PortalSantaCasa.Server.DTOs
{
    public class NotificationCreateDto
    {
        public string Type { get; set; }
        public string Title { get; set; }
        public string Message { get; set; }
        public string Link { get; set; }
        public bool IsGlobal { get; set; } = true;
        public string TargetDepartment { get; set; } = string.Empty;
        public DateTime? NotificationDate { get; set; }
    }
}
