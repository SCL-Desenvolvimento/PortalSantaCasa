import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef,
  OnDestroy,
} from "@angular/core";
import { ChatService } from "../../../core/services/chat.service";
import { UserService } from "../../../core/services/user.service";
import { AuthService } from "../../../core/services/auth.service";
import {
  ChatDto,
  ChatMessageDto,
  UserChatDto,
} from "../../../models/chat.model";
import { User } from "../../../models/user.model";
import { environment } from "../../../../environments/environment";

interface ChatDisplay extends ChatDto {
  messages: ChatMessageDto[];
  isOnline: boolean;
}

@Component({
  selector: "app-chat",
  standalone: false,
  templateUrl: "./chat.component.html",
  styleUrls: ["./chat.component.css"],
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild("messageArea") private messageAreaRef!: ElementRef;

  chatList: ChatDisplay[] = [];
  filteredChats: ChatDisplay[] = [];
  totalUnreadCount: number = 0;
  activeChat: ChatDisplay | null = null;
  loggedUserId: number = 0;

  isChatMenuOpen: boolean = false;
  showAddMembersModal: boolean = false;
  showNewChatModal: boolean = false;
  showGroupModal: boolean = false;

  allUsers: UserChatDto[] = [];
  selectedUsers: UserChatDto[] = [];
  newGroupName: string = "";
  searchTerm: string = "";
  newMessageText: string = "";

  private shouldScrollToBottom: boolean = false;

  constructor(
    private chatService: ChatService,
    private userService: UserService,
    private authService: AuthService,
    private cd: ChangeDetectorRef
  ) {
    this.setupSignalRSubscriptions();
  }

  private setupSignalRSubscriptions(): void {
    this.chatService.messageReceived$.subscribe((message) => {
      if (!message) return;

      const chatToUpdate = this.chatList.find(c => c.id === message.chatId);

      if (this.activeChat && message.chatId === this.activeChat.id) {
        if (this.activeChat.messages.some(m => m.id === message.id)) {
          return;
        }
        this.addMessageToActiveChat(message);
        this.chatService.markAsRead(message.chatId).subscribe();
        this.scrollToBottom();
      } else if (chatToUpdate) {
        if ((chatToUpdate.unreadMessagesCount ?? 0) === 0) {
          this.chatService.updateTotalUnreadBy(1);
        }

        chatToUpdate.unreadMessagesCount = (chatToUpdate.unreadMessagesCount ?? 0) + 1;
        chatToUpdate.lastMessage = message.content;
        chatToUpdate.lastMessageTime = message.sentAt;

        this.moveChatToTop(chatToUpdate);
      }

      this.cd.detectChanges();
    });

    this.chatService.newChat$.subscribe((chat) => {
      if (chat) {
        this.addNewChatToList(chat);
        this.chatService.joinChatGroup(chat.id);
        this.cd.detectChanges();
      }
    });

    this.chatService.chatUpdated$.subscribe((chat) => {
      if (chat) {
        this.updateChatInList(chat);
        this.moveChatToTop(chat);
        this.cd.detectChanges();
      }
    });

    this.chatService.totalUnreadCount$.subscribe((count) => {
      this.totalUnreadCount = count;
      this.cd.detectChanges();
    });

    this.chatService.connectionState$.subscribe(state => {
      if (state === 'connected') {
        this.rejoinAllChatGroups();
      }
    });
  }

  ngOnInit(): void {
    this.loggedUserId = this.authService.getUserInfo("id") ?? 0;
    this.loadAllUsers();
    this.loadUserChats();

    setTimeout(() => {
      this.rejoinAllChatGroups();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.activeChat = null;
  }

  private rejoinAllChatGroups(): void {
    this.chatList.forEach(chat => {
      this.chatService.joinChatGroup(chat.id);
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  selectChat(chat: ChatDisplay): void {
    this.isChatMenuOpen = false;

    if (this.activeChat && this.activeChat.id === chat.id) {
      return;
    }

    const previousActiveChat = this.activeChat;
    this.activeChat = chat;
    this.shouldScrollToBottom = true;

    this.chatService.markAsRead(chat.id).subscribe({
      next: () => {
        const previousUnread = chat.unreadMessagesCount || 0;

        chat.unreadMessagesCount = 0;
        this.updateChatUnreadCount(chat.id, 0);

        if (previousUnread > 0) {
          this.totalUnreadCount--;
        }

        chat.unreadMessagesCount = 0;
        this.updateChatUnreadCount(chat.id, 0);

        setTimeout(() => {
          this.chatService.getTotalUnreadChatsCount().subscribe();
        }, 500);
      }
    });

    if (chat.messages.length === 0) {
      this.loadChatMessages(chat.id);
    }

    this.chatService.joinChatGroup(chat.id);
  }

  private updateChatUnreadCount(chatId: number, newCount: number): void {
    const chatIndex = this.chatList.findIndex(c => c.id === chatId);
    if (chatIndex > -1) {
      this.chatList[chatIndex].unreadMessagesCount = newCount;

      const filteredIndex = this.filteredChats.findIndex(c => c.id === chatId);
      if (filteredIndex > -1) {
        this.filteredChats[filteredIndex].unreadMessagesCount = newCount;
      }

      if (this.activeChat && this.activeChat.id === chatId) {
        this.activeChat.unreadMessagesCount = newCount;
      }

      this.cd.detectChanges();
    }
  }

  sendMessage(): void {
    if (!this.newMessageText || !this.activeChat) return;

    const content = this.newMessageText;
    this.newMessageText = "";

    this.chatService.sendMessage(this.activeChat.id, content).subscribe({
      error: () => {
        this.newMessageText = content;
      },
    });
  }

  onSearch(): void {
    const term = this.searchTerm.toLowerCase();

    this.filteredChats = this.chatList.filter(
      (chat) =>
        chat.name.toLowerCase().includes(term) ||
        chat.lastMessage.toLowerCase().includes(term) ||
        chat.members.some((member) =>
          member.username.toLowerCase().includes(term)
        )
    );
  }

  scrollToBottom(): void {
    try {
      if (this.messageAreaRef && this.messageAreaRef.nativeElement) {
        this.messageAreaRef.nativeElement.scrollTop =
          this.messageAreaRef.nativeElement.scrollHeight;
      }
    } catch { }
  }

  private loadUserChats(): void {
    this.chatService.getUserChats().subscribe({
      next: (chats) => {
        this.chatList = chats.map((chat) => ({
          ...chat,
          messages: [],
          isOnline: !chat.isGroup,
        }));
        this.filteredChats = [...this.chatList];

        const initialTotal = this.chatList.filter(c => (c.unreadMessagesCount || 0) > 0).length;
        this.chatService.setTotalUnread(initialTotal);

        this.rejoinAllChatGroups();
      }
    });
  }

  private loadChatMessages(chatId: number): void {
    this.chatService.getChatMessages(chatId).subscribe({
      next: (messages) => {
        const chat = this.chatList.find((c) => c.id === chatId);
        if (chat) {
          chat.messages = messages.map((msg) => ({
            ...msg,
            isSent: msg.senderId === this.loggedUserId,
          }));
          this.shouldScrollToBottom = true;
        }
      }
    });
  }

  private loadAllUsers(): void {
    this.userService.getUser().subscribe({
      next: (users) => {
        this.allUsers = users
          .filter((u) => u.id !== this.loggedUserId)
          .map((u) => this.mapToUserChatDto(u));
      }
    });
  }

  private mapToUserChatDto(user: User): UserChatDto {
    return {
      id: user.id ?? 0,
      username: user.username,
      email: user.email ?? "",
      department: user.department,
      photoUrl: user.photoUrl ? `${environment.serverUrl}${user.photoUrl}` : "",
      isActive: user.isActive,
    };
  }

  private addNewChatToList(chat: ChatDto): void {
    const newChat: ChatDisplay = {
      ...chat,
      messages: [],
      isOnline: !chat.isGroup,
    };
    this.chatList.unshift(newChat);
    this.filteredChats = [...this.chatList];
  }

  private updateChatInList(updatedChat: ChatDto): void {
    const index = this.chatList.findIndex((c) => c.id === updatedChat.id);
    if (index > -1) {
      const currentChat = this.chatList[index];
      this.chatList[index] = {
        ...currentChat,
        ...updatedChat,
        messages: currentChat.messages,
        isOnline: currentChat.isOnline,
      };
      this.onSearch();
    }
  }

  private moveChatToTop(chat: ChatDisplay | ChatDto): void {
    const index = this.chatList.findIndex(c => c.id === chat.id);
    if (index > -1) {
      const [movedChat] = this.chatList.splice(index, 1);
      this.chatList.unshift(movedChat);
      this.onSearch();
    }
  }

  private addMessageToActiveChat(message: ChatMessageDto): void {
    if (this.activeChat && message.chatId === this.activeChat.id) {
      this.activeChat.messages.push({
        ...message,
        isSent: message.senderId === this.loggedUserId,
      });
      this.activeChat.lastMessage = message.content;
      this.activeChat.lastMessageTime = message.sentAt;
      this.moveChatToTop(this.activeChat);
    }
  }

  calculateTotalUnreadCount(): void {
    this.totalUnreadCount = this.chatList.filter(c => (c.unreadMessagesCount || 0) > 0).length;
  }

  openNewChatModal(): void {
    this.showNewChatModal = true;
    this.selectedUsers = [];
  }

  closeNewChatModal(): void {
    this.showNewChatModal = false;
    this.selectedUsers = [];
  }

  selectUserForNewChat(user: UserChatDto): void {
    this.selectedUsers = [user];
  }

  startChat(): void {
    if (this.selectedUsers.length !== 1) return;

    const targetUserId = this.selectedUsers[0].id;

    const existingChat = this.chatList.find(
      (chat) =>
        !chat.isGroup && chat.members.some((member) => member.id === targetUserId)
    );

    if (existingChat) {
      this.selectChat(existingChat);
      this.closeNewChatModal();
      return;
    }

    this.chatService.startNewChat(this.loggedUserId, targetUserId).subscribe({
      next: (chat) => {
        this.addNewChatToList(chat);
        this.selectChat(this.chatList[0]);
        this.closeNewChatModal();
      }
    });
  }

  toggleChatMenu(): void {
    this.isChatMenuOpen = !this.isChatMenuOpen;
  }

  openGroupModal(): void {
    this.showGroupModal = true;
    this.selectedUsers = [];
    this.newGroupName = "";
  }

  closeGroupModal(): void {
    this.showGroupModal = false;
    this.selectedUsers = [];
    this.newGroupName = "";
  }

  toggleUserSelection(user: UserChatDto): void {
    const index = this.selectedUsers.findIndex((u) => u.id === user.id);
    if (index > -1) {
      this.selectedUsers.splice(index, 1);
    } else {
      this.selectedUsers.push(user);
    }
  }

  createGroup(): void {
    if (!this.newGroupName || this.selectedUsers.length === 0) return;

    const memberIds = this.selectedUsers.map((u) => u.id);

    if (this.loggedUserId && !memberIds.includes(this.loggedUserId)) {
      memberIds.push(this.loggedUserId);
    }

    this.chatService.createGroupChat(this.loggedUserId, this.newGroupName, memberIds).subscribe({
      next: (chat) => {
        this.addNewChatToList(chat);
        this.selectChat(this.chatList[0]);
        this.closeGroupModal();
      },
    });
  }

  openAddMembersModal(): void {
    if (!this.activeChat || !this.activeChat.isGroup) return;
    this.showAddMembersModal = true;

    this.selectedUsers = this.allUsers.filter((user) =>
      this.activeChat!.members.some((member) => member.id === user.id)
    );
  }

  closeAddMembersModal(): void {
    this.showAddMembersModal = false;
    this.selectedUsers = [];
  }

  isUserSelected(user: UserChatDto): boolean {
    return (
      Array.isArray(this.selectedUsers) &&
      this.selectedUsers.some((u) => u.id === user.id)
    );
  }

  addMembersToGroup(): void {
    if (!this.activeChat || !this.activeChat.isGroup) return;

    const currentMemberIds = this.activeChat.members.map((m) => m.id);
    const selectedMemberIds = this.selectedUsers.map((u) => u.id);
    const membersToAdd = selectedMemberIds.filter(
      (id) => !currentMemberIds.includes(id)
    );

    if (membersToAdd.length > 0) {
      this.chatService.addMembersToGroup(this.activeChat.id, membersToAdd).subscribe({
        next: (updatedChat) => {
          const index = this.chatList.findIndex((c) => c.id === updatedChat.id);
          if (index > -1) {
            this.chatList[index] = {
              ...updatedChat,
              messages: this.chatList[index].messages,
              isOnline: false,
            };
            this.activeChat = this.chatList[index];
            this.filteredChats = [...this.chatList];
          }
          this.closeAddMembersModal();
        },
      });
    } else {
      this.closeAddMembersModal();
    }
  }

  deleteActiveChat(): void {
    if (!this.activeChat) return;

    if (confirm(`Tem certeza que deseja excluir o chat "${this.activeChat.name}"?`)) {
      this.chatService.deleteChat(this.activeChat.id).subscribe({
        next: () => {
          this.chatList = this.chatList.filter((c) => c.id !== this.activeChat!.id);
          this.filteredChats = [...this.chatList];
          this.activeChat = null;

          if (this.filteredChats.length > 0) {
            this.selectChat(this.filteredChats[0]);
          }
        },
      });
    }
  }

  markAsUnread(): void {
    if (!this.activeChat) return;

    this.chatService.markAsUnread(this.activeChat.id).subscribe({
      next: () => {
        this.activeChat!.unreadMessagesCount = 1;
        this.chatService.updateTotalUnreadBy(1);
        this.activeChat = null;
      },
    });
  }

  getMemberNames(): string {
    if (!this.activeChat || !this.activeChat.members) {
      return "";
    }
    return this.activeChat.members.map((m) => m.username).join(", ");
  }
}
