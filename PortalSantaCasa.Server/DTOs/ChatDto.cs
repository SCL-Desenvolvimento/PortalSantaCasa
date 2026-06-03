namespace PortalSantaCasa.Server.DTOs
{
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
