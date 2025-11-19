namespace PortalSantaCasa.Server.Entities
{
    public class ChatMessageFile
    {
        public int Id { get; set; }
        public int MessageId { get; set; }
        public string FileName { get; set; } = null!;
        public string FilePath { get; set; } = null!;
        public string ContentType { get; set; } = null!;
        public long FileSize { get; set; }

        public virtual ChatMessage Message { get; set; } = null!;
    }

}
