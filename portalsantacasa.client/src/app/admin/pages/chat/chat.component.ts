import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  ChangeDetectorRef,
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

// Interfaces locais para o componente
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
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild("messageArea") private messageAreaRef!: ElementRef;

  // Dados principais
  chatList: ChatDisplay[] = [];
  filteredChats: ChatDisplay[] = [];
  totalUnreadCount: number = 0;
  totalUnreadChatsCount: number = 0; // Novo campo para o contador do sidebar
  activeChat: ChatDisplay | null = null;
  loggedUserId: number = 0;

  // Variáveis de estado
  isChatMenuOpen: boolean = false;
  showAddMembersModal: boolean = false;
  showNewChatModal: boolean = false;
  showGroupModal: boolean = false;

  allUsers: UserChatDto[] = [];
  selectedUsers: UserChatDto[] = [];
  newGroupName: string = "";
  searchTerm: string = "";
  newMessageText: string = "";

  // Controle de scroll
  private shouldScrollToBottom: boolean = false;

  private currentConnectionId: string = '';

  constructor(
    private chatService: ChatService,
    private userService: UserService,
    private authService: AuthService,
    private cd: ChangeDetectorRef
  ) {
    this.setupSignalRSubscriptions();

  }

  private setupSignalRSubscriptions(): void {
    // Subscription para mensagens recebidas
    this.chatService.messageReceived$.subscribe((message) => {
      if (!message) return;

      console.log('Mensagem recebida via SignalR:', message);

      // Evitar duplicatas
      if (this.activeChat && this.activeChat.messages.some(m => m.id === message.id)) {
        return;
      }

      if (this.activeChat && message.chatId === this.activeChat.id) {
        // Mensagem para o chat ativo
        this.addMessageToActiveChat(message);
        this.chatService.markAsRead(message.chatId).subscribe(); // Sem userId
        this.scrollToBottom();
      } else {
        // Mensagem para chat não ativo - ATUALIZAR LISTA
        this.updateChatListWithMessage(message);
      }
      this.cd.detectChanges();
    });

    this.chatService.newChat$.subscribe((chat) => {
      if (chat) {
        this.addNewChatToList(chat);
        // Entrar no grupo do novo chat
        this.chatService.joinChatGroup(chat.id);
        this.cd.detectChanges();
      }
    });

    this.chatService.chatUpdated$.subscribe((chat) => {
      if (chat) {
        this.updateChatInList(chat);
        this.cd.detectChanges();
      }
    });

    this.chatService.totalUnreadCount$.subscribe((count) => {
      this.totalUnreadChatsCount = count;
      this.cd.detectChanges();
    });

    // Nova subscription para conexão
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

    // Aguardar um pouco para garantir que o SignalR está conectado
    setTimeout(() => {
      this.rejoinAllChatGroups();
    }, 1000);
  }

  private rejoinAllChatGroups(): void {
    console.log('Entrando em todos os grupos de chat...');
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

  // =====================
  // 📌 Lógica de Chat
  // =====================
  selectChat(chat: ChatDisplay): void {

    this.activeChat = chat;
    this.activeChat.unreadMessagesCount = 0; // Usando a nova propriedade
    this.shouldScrollToBottom = true;

    this.chatService.markAsRead(chat.id).subscribe(); // Sem userId e sem calcular total, pois o SignalR fará isso

    if (chat.messages.length === 0) {
      this.loadChatMessages(chat.id);
    }
  }

  sendMessage(): void {
    if (!this.newMessageText || !this.activeChat) return;

    const content = this.newMessageText;
    this.newMessageText = "";

    this.chatService.sendMessage(this.activeChat.id, content).subscribe({ // Sem senderId
      next: (message) => {
        // A mensagem será adicionada via SignalR (ReceiveMessage)
      },
      error: (err) => {
        console.error("Erro ao enviar mensagem:", err);
        this.newMessageText = content;
      },
    });
  }

  // =====================
  // 📌 Busca e Filtros
  // =====================
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

  // =====================
  // 📌 Helpers
  // =====================
  scrollToBottom(): void {
    try {
      if (this.messageAreaRef && this.messageAreaRef.nativeElement) {
        this.messageAreaRef.nativeElement.scrollTop =
          this.messageAreaRef.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error("Erro ao rolar para o final:", err);
    }
  }

  // =====================
  // 📌 Comunicação com API
  // =====================
  private loadUserChats(): void {
    this.chatService.getUserChats().subscribe({ // Sem userId
      next: (chats) => {
        this.chatList = chats.map((chat) => ({
          ...chat,
          messages: [],
          isOnline: !chat.isGroup,
        }));
        this.filteredChats = [...this.chatList];
        // Não precisa calcular total aqui, o backend já envia a contagem total no ChatDto
        // e o sidebar vai buscar o totalUnreadChatsCount

        // Entrar em todos os grupos após carregar os chats
        this.rejoinAllChatGroups();
      },
      error: (err) => {
        console.error("Erro ao carregar chats:", err);
      },
    });
  }

  private loadChatMessages(chatId: number): void {
    this.chatService.getChatMessages(chatId).subscribe({ // Sem userId
      next: (messages) => {
        const chat = this.chatList.find((c) => c.id === chatId);
        if (chat) {
          chat.messages = messages.map((msg) => ({
            ...msg,
            isSent: msg.senderId === this.loggedUserId,
          }));
          this.shouldScrollToBottom = true;
        }
      },
      error: (err) => {
        console.error(`Erro ao carregar mensagens do chat ${chatId}:`, err);
      },
    });
  }

  private loadAllUsers(): void {
    this.userService.getUser().subscribe({
      next: (users) => {
        this.allUsers = users
          .filter((u) => u.id !== this.loggedUserId)
          .map((u) => this.mapToUserChatDto(u));
      },
      error: (err) => {
        console.error("Erro ao carregar usuários:", err);
      },
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

  // =====================
  // 📌 Mensagens e Atualização
  // =====================
  private addMessageToActiveChat(message: ChatMessageDto): void {
    if (!this.activeChat) return;

    const isSent = message.senderId === this.loggedUserId;
    this.activeChat = {
      ...this.activeChat,
      messages: [...this.activeChat.messages, { ...message, isSent }],
    };

    const index = this.chatList.findIndex((c) => c.id === this.activeChat!.id);
    if (index > -1) {
      this.chatList[index] = this.activeChat;
      this.filteredChats = [...this.chatList];
    }

    this.shouldScrollToBottom = true;
  }

  private updateChatListWithMessage(message: ChatMessageDto): void {
    const chatIndex = this.chatList.findIndex((c) => c.id === message.chatId);
    if (chatIndex === -1) return;

    const chat = this.chatList[chatIndex];
    const updatedChat = {
      ...chat,
      lastMessage: message.content,
      lastMessageTime: message.sentAt,
      // A contagem de mensagens não lidas será atualizada pelo SignalR (ChatUpdated)
      // Se a mensagem não for do usuário logado e o chat não estiver ativo, incrementa localmente para feedback imediato
      unreadMessagesCount:
        message.senderId !== this.loggedUserId &&
          chat.id !== this.activeChat?.id
          ? (chat.unreadMessagesCount || 0) + 1
          : chat.unreadMessagesCount || 0,
    };

    this.chatList = [
      updatedChat,
      ...this.chatList.filter((c) => c.id !== updatedChat.id),
    ];
    this.filteredChats = [...this.chatList];
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
      this.filteredChats = [...this.chatList];

      // Reordenar a lista para colocar o chat atualizado no topo
      this.chatList = [
        this.chatList[index],
        ...this.chatList.slice(0, index),
        ...this.chatList.slice(index + 1),
      ];
      this.filteredChats = [...this.chatList];

      if (this.activeChat && this.activeChat.id === updatedChat.id) {
        this.activeChat = this.chatList[0]; // O chat ativo agora está no topo
      }
    }
  }

  // =====================
  // 📌 Funcionalidades Extras
  // =====================
  calculateTotalUnreadCount(): void {
    this.totalUnreadCount = this.chatList.reduce(
      (sum, chat) => sum + (chat.unreadCount || 0),
      0
    );
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
      },
      error: (err) => {
        console.error("Erro ao iniciar novo chat:", err);
      },
    });
  }

  toggleChatMenu(): void {
    this.isChatMenuOpen = !this.isChatMenuOpen;
  }

  // Grupo
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
      error: (err) => {
        console.error("Erro ao criar grupo:", err);
      },
    });
  }

  // Adicionar membros
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
        error: (err) => {
          console.error("Erro ao adicionar membros:", err);
        },
      });
    } else {
      this.closeAddMembersModal();
    }
  }

  // Excluir chat
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
        error: (err) => {
          console.error("Erro ao excluir chat:", err);
        },
      });
    }
  }

  // Marcar como não lido
  markAsUnread(): void {
    if (!this.activeChat) return;

    this.chatService.markAsUnread(this.activeChat.id).subscribe({
      next: () => {
        this.activeChat!.unreadCount = 1;
        this.activeChat = null;
      },
      error: (err) => {
        console.error("Erro ao marcar como não lido:", err);
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
