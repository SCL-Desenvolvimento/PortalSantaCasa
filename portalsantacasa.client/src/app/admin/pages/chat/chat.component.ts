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
export class ChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild("messageArea") private messageAreaRef!: ElementRef;

  // Dados principais
  chatList: ChatDisplay[] = [];
  filteredChats: ChatDisplay[] = [];
  totalUnreadCount: number = 0;
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

      // 1. Encontrar o chat na lista
      const chatToUpdate = this.chatList.find(c => c.id === message.chatId);

      // 2. Adicionar a mensagem ao chat ativo (se for o chat correto)
      if (this.activeChat && message.chatId === this.activeChat.id) {
        // Evitar duplicatas
        if (this.activeChat.messages.some(m => m.id === message.id)) {
          return;
        }
        this.addMessageToActiveChat(message);
        // Marcar como lido imediatamente se o chat estiver aberto
        this.chatService.markAsRead(message.chatId).subscribe();
        this.scrollToBottom();
      } else if (chatToUpdate) {
        // Contabiliza apenas quando o chat passa de 0 → 1 mensagens não lidas
        if ((chatToUpdate.unreadMessagesCount ?? 0) === 0) {
          this.chatService.updateTotalUnreadBy(1);
        }

        // Agora incrementa normalmente o contador local 
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
        // Entrar no grupo do novo chat
        this.chatService.joinChatGroup(chat.id);
        this.cd.detectChanges();
      }
    });

    this.chatService.chatUpdated$.subscribe((chat) => {
      if (chat) {
        this.updateChatInList(chat);
        // Mover o chat para o topo se a atualização for significativa (ex: nova mensagem)
        this.moveChatToTop(chat);
        this.cd.detectChanges();
      }
    });

    this.chatService.totalUnreadCount$.subscribe((count) => {
      this.totalUnreadCount = count; // Atualiza o contador total
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

  ngOnDestroy(): void {
    this.activeChat = null;
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
    this.isChatMenuOpen = false;

    if (this.activeChat && this.activeChat.id === chat.id) {
      return;
    }

    const previousActiveChat = this.activeChat;
    this.activeChat = chat;
    this.shouldScrollToBottom = true;

    console.log(`🗂️ Chat selecionado: ${chat.name} (ID: ${chat.id})`);

    // 🔥 SEMPRE chamar markAsRead quando selecionar um chat, mesmo sem mensagens não lidas
    // Isso garante que o contador total seja atualizado
    console.log(`📨 Marcando chat ${chat.id} como lido...`);

    this.chatService.markAsRead(chat.id).subscribe({
      next: () => {
        console.log(`✅ Chat ${chat.id} marcado como lido com sucesso`);

        // armazenar anterior e zerar localmente
        const previousUnread = chat.unreadMessagesCount || 0;

        // Atualizar localmente o contador do chat específico
        chat.unreadMessagesCount = 0;
        this.updateChatUnreadCount(chat.id, 0);

        // Atualiza o total localmente (se o backend também enviar via SignalR, será substituído)
        if (previousUnread > 0) {
          this.totalUnreadCount--;
        }

        chat.unreadMessagesCount = 0;
        this.updateChatUnreadCount(chat.id, 0);

        // Verificação extra (opcional) — não obrigatório, só pra debug
        setTimeout(() => {
          this.chatService.getTotalUnreadChatsCount().subscribe(count => {
            console.log(`🔢 Contador total verificado (HTTP): ${count}`);
            // opcional: reconciliar se divergente
            // this.chatService.setTotalUnread(count);
          });
        }, 500);
      },
      error: (err) => {
        console.error(`❌ Erro ao marcar chat como lido:`, err);
      }
    });

    // Carregar mensagens se necessário
    if (chat.messages.length === 0) {
      this.loadChatMessages(chat.id);
    }

    // O usuário deve permanecer em todos os grupos de chat para receber notificações
    // de mensagens não lidas, então não vamos sair do grupo anterior.

    // Entrar no grupo do novo chat ativo (se já não estiver)
    this.chatService.joinChatGroup(chat.id);
  }

  private updateChatUnreadCount(chatId: number, newCount: number): void {
    const chatIndex = this.chatList.findIndex(c => c.id === chatId);
    if (chatIndex > -1) {
      this.chatList[chatIndex].unreadMessagesCount = newCount;

      // Atualizar também no filteredChats
      const filteredIndex = this.filteredChats.findIndex(c => c.id === chatId);
      if (filteredIndex > -1) {
        this.filteredChats[filteredIndex].unreadMessagesCount = newCount;
      }

      // Se for o chat ativo, atualizar também
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

        // Inicializa o contador total a partir dos chats carregados
        const initialTotal = this.chatList.filter(c => (c.unreadMessagesCount || 0) > 0).length;

        this.chatService.setTotalUnread(initialTotal);

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
      this.onSearch(); // Reaplicar filtro/ordenação
    }
  }

  private moveChatToTop(chat: ChatDisplay | ChatDto): void {
    const index = this.chatList.findIndex(c => c.id === chat.id);
    if (index > -1) {
      const [movedChat] = this.chatList.splice(index, 1);
      this.chatList.unshift(movedChat);
      this.onSearch(); // Reaplicar filtro/ordenação
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

  // =====================
  // 📌 Funcionalidades Extras
  // =====================
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
        this.activeChat!.unreadMessagesCount = 1;
        // Ajustar total localmente
        this.chatService.updateTotalUnreadBy(1);
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
