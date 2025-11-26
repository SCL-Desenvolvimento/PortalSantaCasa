namespace PortalSantaCasa.Server.DTOs
{
    public class ChatDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string? AvatarUrl { get; set; }
        public bool IsGroup { get; set; }
        public int UnreadMessagesCount { get; set; }
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
        public int MessageType { get; set; } // 0: Normal, 1: System
        public int? SystemEventType { get; set; } // 0: UserRemoved, 1: UserAdded
        public int? TargetUserId { get; set; }
        public string? TargetUserName { get; set; }
        public int? RemovedByUserId { get; set; }
        public string? RemovedByUserName { get; set; }
        public int? AddedByUserId { get; set; }
        public string? AddedByUserName { get; set; }
        public string SenderName { get; set; } = null!;
        public string SenderAvatarUrl { get; set; } = null!;
        public string? Content { get; set; }
        public DateTime SentAt { get; set; }
        public bool IsSent { get; set; } // Indica se foi enviada pelo usuário logado
        public ChatFileDto? File { get; set; }
    }

    public class ChatFileDto
    {
        public string FileName { get; set; } = null!;
        public string Url { get; set; } = null!;
        public string ContentType { get; set; } = null!;
        public long Size { get; set; }
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

    public class RemoveMemberDto
    {
        public int ChatId { get; set; }
        public int MemberId { get; set; }
    }

    public class SendMessageDto
    {
        public int SenderId { get; set; }
        public string? Content { get; set; }
    }
}
