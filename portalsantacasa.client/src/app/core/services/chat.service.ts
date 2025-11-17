import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import {
  AddMembersDto,
  ChatDto,
  ChatMessageDto,
  CreateGroupDto,
  StartChatDto
} from '../../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = `${environment.apiUrl}/Chat`;
  private hubConnection!: signalR.HubConnection;

  private messageReceivedSubject = new BehaviorSubject<ChatMessageDto | null>(null);
  messageReceived$ = this.messageReceivedSubject.asObservable();

  private newChatSubject = new BehaviorSubject<ChatDto | null>(null);
  newChat$ = this.newChatSubject.asObservable();

  private chatUpdatedSubject = new BehaviorSubject<ChatDto | null>(null);
  chatUpdated$ = this.chatUpdatedSubject.asObservable();

  private totalUnreadCountSubject = new BehaviorSubject<number>(0);
  totalUnreadCount$ = this.totalUnreadCountSubject.asObservable();

  private connectionStateSubject = new BehaviorSubject<string>('disconnected');
  connectionState$ = this.connectionStateSubject.asObservable();

  constructor(private http: HttpClient) {
    this.startConnection();
  }

  // =====================================================
  // 🔹 SIGNALR
  // =====================================================
  private startConnection(): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.serverUrl}hub/chats`, {
        accessTokenFactory: () => localStorage.getItem('jwt') ?? ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Estratégia de reconexão
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('✅ SignalR conectado');
        this.connectionStateSubject.next('connected');
        this.registerSignalREvents();
        // 💡 Busca inicial da contagem total de não lidas após a conexão
        this.getTotalUnreadChatsCount().subscribe();
      })
      .catch(err => console.error('❌ Erro ao conectar SignalR:', err));

    // Listeners para eventos de conexão
    this.hubConnection.onreconnecting(() => {
      console.log('🔄 SignalR reconectando...');
      this.connectionStateSubject.next('reconnecting');
    });

    this.hubConnection.onreconnected(() => {
      console.log('✅ SignalR reconectado');
      this.connectionStateSubject.next('connected');
    });

    this.hubConnection.onclose(() => {
      console.log('❌ SignalR desconectado');
      this.connectionStateSubject.next('disconnected');
    });
  }

  private registerSignalREvents(): void {
    this.hubConnection.on('ReceiveMessage', (message: ChatMessageDto) => {
      console.log('📨 Nova mensagem recebida via SignalR:', message);
      this.messageReceivedSubject.next(message);

      // O backend já envia a atualização do contador total via 'UnreadCountUpdate'
      // Não é necessário chamar updateTotalUnreadCount() aqui.
    });

    this.hubConnection.on('NewChat', (chat: ChatDto) => {
      console.log('🆕 Novo chat criado via SignalR:', chat);
      this.newChatSubject.next(chat);
    });

    this.hubConnection.on('ChatUpdated', (chat: ChatDto) => {
      console.log('🔄 Chat atualizado via SignalR:', chat);
      this.chatUpdatedSubject.next(chat);
    });

    this.hubConnection.on('UnreadCountUpdate', (count: number) => {
      console.log('🔢 Contador de não lidos atualizado via SignalR:', count);
      this.totalUnreadCountSubject.next(count);
    });

    this.hubConnection.on('ChatRead', (chatId: number) => {
      console.log('✅ Chat marcado como lido:', chatId);
      // O backend já envia a atualização do contador total via 'UnreadCountUpdate'
      // Não é necessário chamar updateTotalUnreadCount() aqui.
    });
  }

  


  public joinChatGroup(chatId: number): Promise<void> {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return this.hubConnection.invoke('JoinChat', chatId)
        .then(() => console.log(`✅ Entrou no grupo do chat ${chatId}`))
        .catch(err => console.error(`❌ Erro ao entrar no grupo ${chatId}:`, err));
    } else {
      console.warn('⚠️ SignalR não conectado, tentando novamente em 1s...');
      return new Promise((resolve) => {
        setTimeout(() => {
          this.joinChatGroup(chatId).then(resolve);
        }, 1000);
      });
    }
  }

  public leaveChatGroup(chatId: number): Promise<void> {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return this.hubConnection.invoke('LeaveChat', chatId)
        .then(() => console.log(`🚪 Saiu do grupo do chat ${chatId}`))
        .catch(err => console.error(`❌ Erro ao sair do grupo ${chatId}:`, err));
    }
    return Promise.resolve();
  }

  // =====================================================
  // 🔹 HTTP API - compatível com ChatController (.NET 8 sem Identity)
  // =====================================================

  /** GET: api/Chat → retorna os chats do usuário logado */
  getUserChats(): Observable<ChatDto[]> {
    return this.http.get<ChatDto[]>(this.apiUrl).pipe(
      map(chats =>
        chats.map(chat => ({
          ...chat,
          avatarUrl: chat.avatarUrl
            ? `${environment.serverUrl}${chat.avatarUrl}`
            : 'assets/default-avatar.png'
        }))
      )
    );
  }

  /** GET: api/Chat/{chatId}/messages?skip=&take= → mensagens do chat */
  getChatMessages(chatId: number, skip: number = 0, take: number = 500): Observable<ChatMessageDto[]> {
    return this.http
      .get<ChatMessageDto[]>(
        `${this.apiUrl}/${chatId}/messages`,
        { params: { skip: skip.toString(), take: take.toString() } }
      )
      .pipe(
        map(messages =>
          messages.map(msg => ({
            ...msg,
            senderAvatarUrl: msg.senderAvatarUrl
              ? `${environment.serverUrl}${msg.senderAvatarUrl}`
              : 'assets/default-avatar.png'
          }))
        )
      );
  }

  /** POST: api/Chat/start → inicia um chat 1:1 */
  startNewChat(userId: number, targetUserId: number): Observable<ChatDto> {
    const dto: StartChatDto = { userId, targetUserId };
    return this.http.post<ChatDto>(`${this.apiUrl}/start`, dto).pipe(
      map(chat => ({
        ...chat,
        avatarUrl: chat.avatarUrl
          ? `${environment.serverUrl}${chat.avatarUrl}`
          : 'assets/default-avatar.png'
      }))
    );
  }

  /** POST: api/Chat/group → cria um novo grupo */
  createGroupChat(creatorId: number, groupName: string, memberIds: number[]): Observable<ChatDto> {
    const dto: CreateGroupDto = { creatorId, groupName, memberIds };
    return this.http.post<ChatDto>(`${this.apiUrl}/group`, dto).pipe(
      map(chat => ({
        ...chat,
        avatarUrl: chat.avatarUrl
          ? `${environment.serverUrl}${chat.avatarUrl}`
          : 'assets/default-group.png'
      }))
    );
  }

  /** POST: api/Chat/{chatId}/members → adiciona membros ao grupo */
  addMembersToGroup(chatId: number, memberIds: number[]): Observable<ChatDto> {
    const dto: AddMembersDto = { chatId, memberIds };
    return this.http.post<ChatDto>(`${this.apiUrl}/${chatId}/members`, dto).pipe(
      map(chat => ({
        ...chat,
        avatarUrl: chat.avatarUrl
          ? `${environment.serverUrl}${chat.avatarUrl}`
          : 'assets/default-group.png'
      }))
    );
  }

  /** POST: api/Chat/{chatId}/send → envia uma mensagem */
  sendMessage(chatId: number, content: string): Observable<ChatMessageDto> {
    return this.http.post<ChatMessageDto>(`${this.apiUrl}/${chatId}/send`, { content }).pipe(
      map(msg => ({
        ...msg,
        senderAvatarUrl: msg.senderAvatarUrl
          ? `${environment.serverUrl}${msg.senderAvatarUrl}`
          : 'assets/default-avatar.png'
      }))
    );
  }

  /** DELETE: api/Chat/{chatId} → exclui o chat */
  deleteChat(chatId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${chatId}`);
  }

  /** POST: api/Chat/{chatId}/read → marca como lido */
  markAsRead(chatId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${chatId}/read`, {}).pipe(
      tap(() => {
// O backend (ChatService) agora envia a atualização do contador total via SignalR após a marcação de leitura.
	        // Não é mais necessário chamar getTotalUnreadChatsCount() via HTTP aqui.
      })
    );
  }

  /** POST: api/Chat/{chatId}/unread → marca como não lido */
  markAsUnread(chatId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${chatId}/unread`, {});
  }

  /** POST: api/Chat/{chatId}/avatar → atualiza avatar do grupo */
  uploadGroupAvatar(chatId: number, formData: FormData): Observable<ChatDto> {
    return this.http.post<ChatDto>(`${this.apiUrl}/${chatId}/avatar`, formData).pipe(
      map(chat => ({
        ...chat,
        avatarUrl: chat.avatarUrl
          ? `${environment.serverUrl}${chat.avatarUrl}`
          : 'assets/default-group.png'
      }))
    );
  }

  /** GET: api/Chat/total-unread-count → retorna o número total de chats não lidos */
  getTotalUnreadChatsCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/total-unread-count`).pipe(
      tap(count => {
        this.totalUnreadCountSubject.next(count);
      }),
      catchError(error => {
        console.error('Erro ao buscar contagem de chats não lidos:', error);
        return of(0);
      })
    );
  }
}
