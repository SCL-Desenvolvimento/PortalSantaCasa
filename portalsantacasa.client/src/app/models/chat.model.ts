export interface UserChatDto {
  id: number;
  username: string;
  email: string;
  department: string;
  photoUrl: string;
  isActive: boolean;
}

export interface ChatMessageDto {
  id: number;
  chatId: number;
  senderId: number;
  senderName: string;
  senderAvatarUrl: string;
  content: string;
  sentAt: Date;
  isSent: boolean;
}

export interface ChatDto {
  id: number;
  name: string;
  avatarUrl: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  members: UserChatDto[];
}

export interface StartChatDto {
  userId: number;
  targetUserId: number;
}

export interface CreateGroupDto {
  creatorId: number;
  groupName: string;
  memberIds: number[];
}

export interface AddMembersDto {
  chatId: number;
  memberIds: number[];
}
