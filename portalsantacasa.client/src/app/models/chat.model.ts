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
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  unreadMessagesCount: number;
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
