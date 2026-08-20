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
import { OnlineService, OnlineUser } from "../../../core/services/online.service"; // Adicione esta importação
import {
  ChatDto,
  ChatMessageDto,
  ChatMessageReactionDto,
  UserChatDto,
} from "../../../models/chat.model";
import { User } from "../../../models/user.model";
import { environment } from "../../../../environments/environment";
import { Subject, takeUntil } from "rxjs";

interface ChatDisplay extends ChatDto {
  messages: ChatMessageDto[];
  isOnline: boolean;
  otherUserId?: number; // Para chats individuais, guarda o ID do outro usuário
}

@Component({
  selector: "app-chat",
  standalone: false,
  templateUrl: "./chat.component.html",
  styleUrls: ["./chat.component.css"],
})
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild("messageArea") private messageAreaRef!: ElementRef;
  @ViewChild("messageInput") private messageInputRef!: ElementRef<HTMLInputElement>;

  chatList: ChatDisplay[] = [];
  filteredChats: ChatDisplay[] = [];
  totalUnreadCount: number = 0;
  activeChat: ChatDisplay | null = null;
  loggedUserId: number = 0;

  isChatMenuOpen: boolean = false;
  showAddMembersModal: boolean = false;
  showGroupManagementModal: boolean = false;
  showNewChatModal: boolean = false;
  showGroupModal: boolean = false;
  showDepartmentChatModal: boolean = false;

  allUsers: UserChatDto[] = [];
  selectedUsers: UserChatDto[] = [];
  departments: string[] = [];
  selectedDepartment: string = "";
  newGroupName: string = "";
  searchTerm: string = "";
  newMessageText: string = "";
  showEmojiPicker = false;
  reactionPickerMessageId: number | null = null;
  readonly reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "🙏", "👏"];
  readonly messageEmojis = [
    "😀", "😃", "😄", "😁", "😊", "😍", "🥰", "😘",
    "😂", "🤣", "😉", "😎", "🤔", "😮", "😢", "😭",
    "😡", "🥳", "🤩", "😴", "👍", "👎", "👏", "🙌",
    "🙏", "💪", "🤝", "👌", "❤️", "💙", "💚", "💛",
    "🔥", "✨", "🎉", "✅", "🚀", "💡", "📌", "😊"
  ];
  private shouldScrollToBottom: boolean = false;
  groupedMessages: any[] = [];
  finalMessageList: any[] = [];
  @ViewChild("fileInput") fileInput!: ElementRef;

  // Adicione esta propriedade para controlar as inscrições
  private destroy$ = new Subject<void>();
  private attachmentObjectUrls = new Set<string>();

  // Adicione esta propriedade para armazenar usuários online
  onlineUsers: OnlineUser[] = [];

  constructor(
    private chatService: ChatService,
    private userService: UserService,
    private authService: AuthService,
    private onlineService: OnlineService, // Injete OnlineService
    private cd: ChangeDetectorRef
  ) {
    this.setupSignalRSubscriptions();
  }

  private buildFinalMessageList(): void {
    if (!this.activeChat) {
      this.finalMessageList = [];
      return;
    }

    const groupedByAuthor = this.groupMessages(this.activeChat.messages);
    this.finalMessageList = this.groupMessagesByDay(groupedByAuthor);
  }

  formatSystemMessage(message: ChatMessageDto): string {
    if (message.addedByUserName) {
      // Lógica existente...
    }

    if (message.messageType !== 1) {
      return '';
    }

    const loggedId = this.loggedUserId;

    if (message.systemEventType === 0) {
      const removedBy = message.removedByUserName || 'Um administrador';
      const removedUser = message.targetUserName || 'Um usuário';

      if (message.removedByUserId === loggedId) {
        return `Você removeu ${removedUser} do grupo.`;
      } else if (message.targetUserId === loggedId) {
        return `${removedBy} removeu você do grupo.`;
      } else {
        return `${removedBy} removeu ${removedUser} do grupo.`;
      }
    }

    if (message.systemEventType === 1) {
      const addedBy = message.addedByUserName || 'Um administrador';
      const addedUser = message.targetUserName || 'um usuário';

      if (message.addedByUserId === loggedId) {
        return `Você adicionou ${addedUser} ao grupo.`;
      }

      if (message.targetUserId === loggedId) {
        return `${addedBy} adicionou você ao grupo.`;
      }

      return `${addedBy} adicionou ${addedUser} ao grupo.`;
    }

    return 'Evento de sistema desconhecido.';
  }

  private groupMessagesByDay(groups: any[]): any[] {
    const result: any[] = [];
    let lastDate = "";

    for (const group of groups) {
      if (!group.messages || group.messages.length === 0) continue;

      const messageDate = new Date(group.messages[0].sentAt)
        .toLocaleDateString("pt-BR");

      if (messageDate !== lastDate) {
        lastDate = messageDate;

        result.push({
          type: "date",
          date: messageDate
        });
      }

      result.push({
        type: "message-group",
        group
      });
    }

    return result;
  }

  private groupMessages(messages: ChatMessageDto[]): any[] {
    if (!messages || messages.length === 0) return [];

    const groups = [];
    let currentGroup: any = null;

    const sortedMessages = [...messages].sort((a, b) =>
      new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );

    for (const message of sortedMessages) {
      if (message.messageType === 1) {
        if (currentGroup) {
          groups.push(currentGroup);
          currentGroup = null;
        }

        groups.push({
          senderId: null,
          senderName: null,
          senderUsername: null,
          senderRe: null,
          senderDepartment: null,
          senderAvatarUrl: null,
          messages: [message],
          lastMessageTime: message.sentAt
        });

        continue;
      }

      if (
        !currentGroup ||
        currentGroup.senderId !== message.senderId ||
        currentGroup.senderName !== this.getMessageSenderLabel(message) ||
        this.getTimeDifference(currentGroup.lastMessageTime, message.sentAt.toString()) > 2
      ) {
        if (currentGroup) {
          groups.push(currentGroup);
        }

        currentGroup = {
          senderId: message.senderId,
          senderName: this.getMessageSenderLabel(message),
          senderUsername: message.senderUsername || message.senderName,
          senderRe: message.senderRe,
          senderDepartment: message.senderDepartment,
          senderAvatarUrl: message.senderAvatarUrl,
          messages: [message],
          lastMessageTime: message.sentAt
        };
      } else {
        currentGroup.messages.push(message);
        currentGroup.lastMessageTime = message.sentAt;
      }
    }

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private getTimeDifference(time1: string, time2: string): number {
    const date1 = new Date(time1).getTime();
    const date2 = new Date(time2).getTime();
    return Math.abs(date2 - date1) / (1000 * 60);
  }

  private setupSignalRSubscriptions(): void {
    this.chatService.messageReceived$.subscribe((message) => {
      if (!message) return;

      const chatToUpdate = this.chatList.find(c => c.id === message.chatId);

      if (this.activeChat && message.chatId === this.activeChat.id) {
        if (this.activeChat.messages.some(m => m.id === message.id)) {
          return;
        }
        this.hydrateAttachment(message);
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

      this.cd.markForCheck();
    });

    this.chatService.messageReactionsUpdated$.subscribe((update) => {
      if (!update) return;

      const chat = this.chatList.find(item => item.id === update.chatId);
      const message = chat?.messages.find(item => item.id === update.messageId);
      if (message) {
        message.reactions = update.reactions ?? [];
        this.cd.markForCheck();
      }
    });

    this.chatService.newChat$.subscribe((chat) => {
      if (chat) {
        this.addNewChatToList(chat);
        this.chatService.joinChatGroup(chat.id);
        this.cd.markForCheck();
      }
    });

    this.chatService.chatUpdated$.subscribe((chat) => {
      if (chat) {
        this.updateChatInList(chat);
        this.moveChatToTop(chat);
        this.cd.markForCheck();
      }
    });

    this.chatService.totalUnreadCount$.subscribe((count) => {
      this.totalUnreadCount = count;
      this.cd.markForCheck();
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

    // Subscrever para atualizações de usuários online
    this.setupOnlineUsersSubscription();

    setTimeout(() => {
      this.rejoinAllChatGroups();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.activeChat = null;
    this.attachmentObjectUrls.forEach(url => URL.revokeObjectURL(url));
    this.attachmentObjectUrls.clear();
    this.destroy$.next();
    this.destroy$.complete();
  }

  getMessageSenderLabel(message: ChatMessageDto): string {
    const displayName = message.senderDisplayName || message.senderName || message.senderUsername || "Usuário";
    const department = message.senderDepartment || "";

    return department ? `${displayName} - ${department}` : displayName;
  }

  getMessageSenderDetails(message: ChatMessageDto): string {
    const account = message.senderUsername || message.senderName || "Conta não informada";
    const department = message.senderDepartment || "Setor não informado";

    return `Enviado por: ${account}\nSetor: ${department}`;
  }

  getLoggedDepartment(): string {
    return this.authService.getUserInfo("department") || "";
  }

  // Novo método para configurar a inscrição de usuários online
  private setupOnlineUsersSubscription(): void {
    this.onlineService.onlineUsers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.onlineUsers = users;
        this.updateChatsOnlineStatus();
        this.cd.markForCheck();
      });
  }

  // Método para atualizar o status online/offline dos chats
  private updateChatsOnlineStatus(): void {
    this.chatList.forEach(chat => {
      if (!chat.isGroup && chat.otherUserId) {
        // Para chats individuais, verifica se o outro usuário está online
        const isOnline = this.onlineUsers.some(user => user.id === chat.otherUserId);
        chat.isOnline = isOnline;
      } else {
        // Para grupos, não mostramos status
        chat.isOnline = false;
      }
    });

    // Atualizar também a lista filtrada
    this.filteredChats = [...this.chatList];
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
    this.showEmojiPicker = false;
    this.reactionPickerMessageId = null;

    if (this.activeChat && this.activeChat.id === chat.id) {
      return;
    }

    const previousActiveChat = this.activeChat;
    this.activeChat = chat;
    this.shouldScrollToBottom = true;

    // Limpa os grupos anteriores
    this.groupedMessages = [];

    this.cd.detectChanges();

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
    } else {
      this.buildFinalMessageList();
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
    this.showEmojiPicker = false;

    this.chatService.sendMessage(this.activeChat.id, content).subscribe({
      error: () => {
        this.newMessageText = content;
      },
    });
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
    this.reactionPickerMessageId = null;
  }

  insertEmoji(emoji: string): void {
    const input = this.messageInputRef?.nativeElement;
    const start = input?.selectionStart ?? this.newMessageText.length;
    const end = input?.selectionEnd ?? start;

    this.newMessageText =
      this.newMessageText.slice(0, start) + emoji + this.newMessageText.slice(end);

    setTimeout(() => {
      input?.focus();
      input?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  toggleReactionPicker(messageId: number, event: Event): void {
    event.stopPropagation();
    this.showEmojiPicker = false;
    this.reactionPickerMessageId =
      this.reactionPickerMessageId === messageId ? null : messageId;
  }

  reactToMessage(message: ChatMessageDto, emoji: string, event?: Event): void {
    event?.stopPropagation();
    if (!this.activeChat) return;

    this.reactionPickerMessageId = null;
    this.chatService.toggleMessageReaction(this.activeChat.id, message.id, emoji).subscribe({
      next: reactions => {
        message.reactions = reactions;
        this.cd.markForCheck();
      }
    });
  }

  getReactionGroups(message: ChatMessageDto): Array<{
    emoji: string;
    count: number;
    reactedByLoggedUser: boolean;
    names: string;
  }> {
    const groups = new Map<string, ChatMessageReactionDto[]>();

    for (const reaction of message.reactions ?? []) {
      groups.set(reaction.emoji, [...(groups.get(reaction.emoji) ?? []), reaction]);
    }

    return Array.from(groups.entries()).map(([emoji, reactions]) => ({
      emoji,
      count: reactions.length,
      reactedByLoggedUser: reactions.some(reaction => reaction.userId === this.loggedUserId),
      names: reactions.map(reaction => reaction.userName).join(", ")
    }));
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
        this.chatList = chats.map((chat) => {
          // Para chats individuais, encontrar o ID do outro usuário
          let otherUserId: number | undefined;
          if (!chat.isGroup && chat.members && chat.members.length > 0) {
            const otherUser = chat.members.find(member => member.id !== this.loggedUserId);
            otherUserId = otherUser?.id;
          }

          return {
            ...chat,
            messages: [],
            isOnline: false, // Inicialmente offline, será atualizado pela subscription
            otherUserId: otherUserId
          };
        });

        this.filteredChats = [...this.chatList];

        // Atualizar status online após carregar os chats
        this.updateChatsOnlineStatus();

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
            reactions: msg.reactions ?? [],
            sentAt: new Date(msg.sentAt),
            isSent: msg.senderId === this.loggedUserId,
          }));
          chat.messages.forEach(message => this.hydrateAttachment(message));
          this.buildFinalMessageList();
          this.shouldScrollToBottom = true;
        }
      }
    });
  }

  private loadAllUsers(): void {
    this.userService.getDirectory().subscribe({
      next: (users) => {
        this.allUsers = users
          .filter((u) => u.id !== this.loggedUserId)
          .map((u) => this.mapToUserChatDto(u));

        const ownDepartment = this.getLoggedDepartment().trim().toLocaleLowerCase();
        this.departments = Array.from(new Set(
          users
            .filter(user => user.isActive && !!user.department?.trim())
            .map(user => user.department.trim())
            .filter(department => department.toLocaleLowerCase() !== ownDepartment)
        )).sort((a, b) => a.localeCompare(b, "pt-BR"));
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

    const chatExistente = this.chatList.find(c => c.id === chat.id);
    if (chatExistente) {
      return; // Se já existe, não faz nada e evita a duplicata
    }

    const otherUser = chat.members.find(member => member.id !== this.loggedUserId);

    let nomeExibido = chat.name;
    if (!chat.isGroup && otherUser) {
      nomeExibido = otherUser.username;
    }

    const isOnline = otherUser ? this.onlineUsers.some(user => user.id === otherUser.id) : false;

    const newChat: ChatDisplay = {
      ...chat,
      name: nomeExibido,
      messages: [],
      isOnline: isOnline,
      otherUserId: otherUser?.id
    };

    this.chatList.unshift(newChat);
    this.filteredChats = [...this.chatList];

    this.cd.detectChanges();
  }

  private updateChatInList(updatedChat: ChatDto): void {
    const index = this.chatList.findIndex((c) => c.id === updatedChat.id);
    if (index > -1) {
      const currentChat = this.chatList[index];

      // Preservar o otherUserId e atualizar o status online
      let otherUserId = currentChat.otherUserId;
      if (!updatedChat.isGroup && updatedChat.members && updatedChat.members.length > 0) {
        const otherUser = updatedChat.members.find(member => member.id !== this.loggedUserId);
        otherUserId = otherUser?.id;
      }

      const isOnline = otherUserId ? this.onlineUsers.some(user => user.id === otherUserId) : false;

      this.chatList[index] = {
        ...currentChat,
        ...updatedChat,
        messages: currentChat.messages,
        isOnline: isOnline,
        otherUserId: otherUserId
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
        reactions: message.reactions ?? [],
        sentAt: new Date(message.sentAt),
        isSent: message.senderId === this.loggedUserId,
      });
      this.activeChat.lastMessage = message.content;
      this.activeChat.lastMessageTime = message.sentAt;

      this.buildFinalMessageList();
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

  openDepartmentChatModal(): void {
    this.selectedDepartment = "";
    this.showDepartmentChatModal = true;
  }

  closeDepartmentChatModal(): void {
    this.showDepartmentChatModal = false;
    this.selectedDepartment = "";
  }

  startDepartmentChat(): void {
    if (!this.selectedDepartment) return;

    this.chatService.startDepartmentChat(this.selectedDepartment).subscribe({
      next: chat => {
        this.addNewChatToList(chat);
        const createdChat = this.chatList.find(item => item.id === chat.id);
        if (createdChat) this.selectChat(createdChat);
        this.closeDepartmentChatModal();
      }
    });
  }

  getConversationSubtitle(): string {
    if (!this.activeChat) return "";

    if (this.activeChat.isDepartmentChat) {
      return `${this.activeChat.sourceDepartment} ↔ ${this.activeChat.targetDepartment} · todos dos dois setores podem acompanhar`;
    }

    return this.activeChat.isGroup
      ? this.getMemberNames()
      : "Conversa privada entre usuários";
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
        const createdChat = this.chatList[0];
        this.selectChat(createdChat);
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

  openGroupManagementModal(): void {
    if (!this.activeChat || !this.activeChat.isGroup) return;
    this.showGroupManagementModal = true;
  }

  closeGroupManagementModal(): void {
    this.showGroupManagementModal = false;
  }

  openAddMembersModal(): void {
    if (!this.activeChat || !this.activeChat.isGroup) return;

    this.selectedUsers = [];
    this.showAddMembersModal = true;
  }

  closeAddMembersModal(): void {
    this.showAddMembersModal = false;
    this.selectedUsers = [];
  }

  isMemberOfActiveChat(userId: number): boolean {
    return this.activeChat?.members.some(m => m.id === userId) ?? false;
  }

  removeMember(memberId: number): void {
    if (!this.activeChat || !this.activeChat.isGroup) return;

    if (confirm(`Tem certeza que deseja remover este membro do grupo "${this.activeChat.name}"?`)) {
      this.chatService.removeMemberFromGroup(this.activeChat.id, memberId).subscribe({
        next: (updatedChat) => {
          this.updateChatAfterGroupChange(updatedChat);
          this.closeGroupManagementModal();
        },
        error: (err) => {
          console.error("Erro ao remover membro:", err);
          alert("Não foi possível remover o membro. Tente novamente.");
        }
      });
    }
  }

  onGroupPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (!this.activeChat) return;

      this.chatService.uploadGroupPhoto(this.activeChat.id, file).subscribe({
        next: (updatedChat) => {
          this.updateChatAfterGroupChange(updatedChat);
          alert("Foto do grupo atualizada com sucesso!");
        },
        error: (err) => {
          console.error("Erro ao fazer upload da foto:", err);
          alert("Não foi possível atualizar a foto do grupo. Tente novamente.");
        }
      });
    }
  }

  private updateChatAfterGroupChange(updatedChat: ChatDto): void {
    const index = this.chatList.findIndex((c) => c.id === updatedChat.id);
    if (index > -1) {
      this.chatList[index] = {
        ...this.chatList[index],
        ...updatedChat,
        messages: this.chatList[index].messages,
      };
      this.activeChat = this.chatList[index];
      this.filteredChats = [...this.chatList];
      this.cd.detectChanges();
    }
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
    const membersToAdd = this.selectedUsers
      .map((u) => u.id)
      .filter((id) => !currentMemberIds.includes(id));

    if (membersToAdd.length > 0) {
      this.chatService.addMembersToGroup(this.activeChat.id, membersToAdd).subscribe({
        next: (updatedChat) => {
          this.updateChatAfterGroupChange(updatedChat);
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
          } else {
            this.activeChat = null;
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

  openFilePicker() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file || !this.activeChat) return;

    this.chatService.sendMessage(this.activeChat.id, "", [file]).subscribe({
      next: (message) => {
        this.scrollToBottom();
      }
    });

    this.fileInput.nativeElement.value = "";
  }

  selectedMediaUrl: string | null = null;
  selectedMediaIsVideo = false;

  openMediaModal(url: string, isVideo = false) {
    this.selectedMediaUrl = url;
    this.selectedMediaIsVideo = isVideo;
  }

  closeMediaModal() {
    this.selectedMediaUrl = null;
    this.selectedMediaIsVideo = false;
  }

  downloadFile(message: any) {
    const file = message?.file;
    if (!file?.url) return;

    this.chatService.getAttachment(file.url)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: blob => {
          if (!blob.size) {
            console.error("Erro ao baixar arquivo: o servidor retornou um arquivo vazio.");
            return;
          }

          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = file.fileName;
          link.hidden = true;
          document.body.appendChild(link);
          link.click();
          link.remove();

          // O navegador ainda pode estar lendo o blob depois do clique.
          // Revogá-lo imediatamente pode gerar um download incompleto/corrompido.
          window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        },
        error: err => console.error("Erro ao baixar arquivo:", err)
      });
  }

  private hydrateAttachment(message: ChatMessageDto): void {
    const secureUrl = message.file?.url;
    if (!secureUrl || secureUrl.startsWith("blob:")) return;

    // Documentos são obtidos somente no clique pelo HttpClient autenticado.
    // A hidratação antecipada é necessária apenas para previews de mídia.
    if (!this.isImage(message) && !this.isVideo(message)) return;

    message.file!.url = "";
    this.chatService.getAttachment(secureUrl)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: blob => {
          const objectUrl = URL.createObjectURL(blob);
          this.attachmentObjectUrls.add(objectUrl);
          message.file!.url = objectUrl;
          this.cd.markForCheck();
        },
        error: () => {
          message.file!.url = "";
        }
      });
  }

  hasFile(message: any): boolean {
    return !!message?.file?.contentType;
  }

  isImage(message: any): boolean {
    if (!this.hasFile(message)) return false;
    const type = message.file.contentType.toLowerCase();
    return type.startsWith('image/');
  }

  isVideo(message: any): boolean {
    if (!this.hasFile(message)) return false;
    const type = message.file.contentType.toLowerCase();
    return type.startsWith('video/');
  }

  isDocument(message: any): boolean {
    if (!this.hasFile(message)) return false;
    return !this.isImage(message) && !this.isVideo(message);
  }

  // Método para obter o status online do usuário em uma conversa individual
  getOnlineStatusTooltip(chat: ChatDisplay): string {
    if (chat.isGroup) {
      return 'Grupo';
    }

    if (chat.isOnline) {
      const onlineUser = this.onlineUsers.find(u => u.id === chat.otherUserId);
      return `Online agora - ${onlineUser?.userName || 'Usuário'}`;
    } else {
      return 'Offline';
    }
  }
}
