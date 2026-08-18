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
  senderUsername: string;
  senderDisplayName?: string;
  senderRe?: string;
  senderDepartment?: string;
  messageType: number; // 0: Normal, 1: System
  systemEventType?: number; // 0: UserRemoved, 1: UserAdded
  targetUserId?: number;
  targetUserName?: string;
  removedByUserId?: number;
  removedByUserName?: string;
  addedByUserId?: number;
  addedByUserName?: string;
  senderAvatarUrl: string;
  content: string;
  sentAt: Date;
  isSent: boolean;
  file?: ChatFileDto;
  reactions: ChatMessageReactionDto[];
}

export interface ChatMessageReactionDto {
  userId: number;
  userName: string;
  emoji: string;
}

export interface ChatMessageReactionsUpdatedDto {
  chatId: number;
  messageId: number;
  reactions: ChatMessageReactionDto[];
}

export interface ChatFileDto {
  fileName: string;
  url: string;
  contentType: string;
  size: number;
}

export interface ChatDto {
  id: number;
  name: string;
  avatarUrl: string;
  isGroup: boolean;
  isDepartmentChat: boolean;
  sourceDepartment?: string;
  targetDepartment?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  unreadMessagesCount: number;
  members: UserChatDto[];
  isDeleted: boolean;
}

export interface StartChatDto {
  userId: number;
  targetUserId: number;
}

export interface StartDepartmentChatDto {
  targetDepartment: string;
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
