namespace PortalSantaCasa.Server.DTOs
{
    public class ChatDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string? AvatarUrl { get; set; }
        public bool IsGroup { get; set; }
        public string LastMessage { get; set; } = string.Empty;
        public DateTime LastMessageTime { get; set; }
        public int UnreadCount { get; set; }
        public IEnumerable<UserChatDto> Members { get; set; } = [];
    }

    public class ChatMessageDto
    {
        public int Id { get; set; }
        public int ChatId { get; set; }
        public int SenderId { get; set; }
        public string SenderName { get; set; } = null!;
        public string SenderAvatarUrl { get; set; } = null!;
        public string Content { get; set; } = null!;
        public DateTime SentAt { get; set; }
        public bool IsSent { get; set; } // Indica se foi enviada pelo usuário logado
    }

    public class StartChatDto
    {
        public int UserId { get; set; }
        public int TargetUserId { get; set; }
    }

    public class CreateGroupDto
    {
        public int CreatorId { get; set; }
        public string GroupName { get; set; } = null!;
        public IEnumerable<int> MemberIds { get; set; } = new List<int>();
    }

    public class AddMembersDto
    {
        public int ChatId { get; set; }
        public IEnumerable<int> MemberIds { get; set; } = new List<int>();
    }

    public class SendMessageDto
    {
        public int SenderId { get; set; }
        public string Content { get; set; } = null!;
    }
}
