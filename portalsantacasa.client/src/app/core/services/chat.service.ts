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
        this.connectionStateSubject.next('connected');
        this.registerSignalREvents();
        // 💡 Busca inicial da contagem total de não lidas após a conexão
        this.getTotalUnreadChatsCount().subscribe();
      })
      .catch(
        err => console.error('❌ Erro ao conectar SignalR:', err)
      );

    // Listeners para eventos de conexão
    this.hubConnection.onreconnecting(() => {
      this.connectionStateSubject.next('reconnecting');
    });

    this.hubConnection.onreconnected(() => {
      this.connectionStateSubject.next('connected');
      // 💡 Garante que o contador total seja atualizado após a reconexão
      this.getTotalUnreadChatsCount().subscribe();
    });

    this.hubConnection.onclose(() => {
      this.connectionStateSubject.next('disconnected');
    });
  }

  private registerSignalREvents(): void {
    this.hubConnection.on('ReceiveMessage', (message: ChatMessageDto) => {
      const mapped = this.mapMessageAvatar(message);
      this.messageReceivedSubject.next(mapped);
    });

    this.hubConnection.on('NewChat', (chat: ChatDto) => {
      const mapped = this.mapChat(chat);
      this.newChatSubject.next(mapped);
    });

    this.hubConnection.on('ChatUpdated', (chat: ChatDto) => {
      const mapped = this.mapChat(chat);
      this.chatUpdatedSubject.next(mapped);
    });

    this.hubConnection.on('UnreadCountUpdate', (count: number) => {
      this.totalUnreadCountSubject.next(count);
    });

    this.hubConnection.on('ChatRead', (chatId: number) => {
    });
  }

  public joinChatGroup(chatId: number): Promise<void> {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return this.hubConnection.invoke('JoinChat', chatId);
    } else {
      return new Promise((resolve) => {
        setTimeout(() => {
          this.joinChatGroup(chatId).then(resolve);
        }, 1000);
      });
    }
  }

  public leaveChatGroup(chatId: number): Promise<void> {
    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return this.hubConnection.invoke('LeaveChat', chatId);
    }
    return Promise.resolve();
  }

  // =====================================================
  // 🔹 HTTP API - compatível com ChatController (.NET 8 sem Identity)
  // =====================================================

  getUserChats(): Observable<ChatDto[]> {
    return this.http.get<ChatDto[]>(this.apiUrl).pipe(
      map(chats =>
        chats.map(chat => ({
          ...chat,
          avatarUrl: chat.avatarUrl
            ? `${environment.serverUrl}${chat.avatarUrl}`
            : 'assets/default-avatar.png',

          members: chat.members?.map(member => ({
            ...member,
            photoUrl: member.photoUrl
              ? `${environment.serverUrl}${member.photoUrl}`
              : 'assets/default-avatar.png'
          })) ?? []
        }))
      )
    );
  }

  getChatMessages(chatId: number, skip: number = 0, take: number = 500): Observable<ChatMessageDto[]> {
    return this.http
      .get<ChatMessageDto[]>(`${this.apiUrl}/${chatId}/messages`, {
        params: { skip: skip.toString(), take: take.toString() }
      })
      .pipe(
        map(messages =>
          messages.map(msg => ({
            ...msg,

            senderAvatarUrl: msg.senderAvatarUrl
              ? `${environment.serverUrl}${msg.senderAvatarUrl}`
              : 'assets/default-avatar.png',

            file: msg.file
              ? {
                ...msg.file,
                url: `${environment.serverUrl}${msg.file.url}`
              }
              : undefined
          }))
        )
      );

  }

  startNewChat(userId: number, targetUserId: number): Observable<ChatDto> {
    const dto: StartChatDto = { userId, targetUserId };
    return this.http.post<ChatDto>(`${this.apiUrl}/start`, dto).pipe(
      map(chat => ({
        ...chat,
        avatarUrl: chat.avatarUrl
          ? `${environment.serverUrl}${chat.avatarUrl}`
          : 'assets/default-avatar.png',

        members: chat.members?.map(member => ({
          ...member,
          photoUrl: member.photoUrl
            ? `${environment.serverUrl}${member.photoUrl}`
            : 'assets/default-avatar.png'
        })) ?? []
      }))
    );
  }

  createGroupChat(creatorId: number, groupName: string, memberIds: number[]): Observable<ChatDto> {
    const dto: CreateGroupDto = { creatorId, groupName, memberIds };
    return this.http.post<ChatDto>(`${this.apiUrl}/group`, dto).pipe(
      map(chat => ({
        ...chat,
        avatarUrl: chat.avatarUrl
          ? `${environment.serverUrl}${chat.avatarUrl}`
          : 'assets/default-group.png',

        members: chat.members?.map(member => ({
          ...member,
          photoUrl: member.photoUrl
            ? `${environment.serverUrl}${member.photoUrl}`
            : 'assets/default-avatar.png'
        })) ?? []
      }))
    );
  }

  addMembersToGroup(chatId: number, memberIds: number[]): Observable<ChatDto> {
    const dto: AddMembersDto = { chatId, memberIds };
    return this.http.post<ChatDto>(`${this.apiUrl}/${chatId}/members`, dto).pipe(
      map(chat => ({
        ...chat,
        avatarUrl: chat.avatarUrl
          ? `${environment.serverUrl}${chat.avatarUrl}`
          : 'assets/default-group.png',

        members: chat.members?.map(member => ({
          ...member,
          photoUrl: member.photoUrl
            ? `${environment.serverUrl}${member.photoUrl}`
            : 'assets/default-avatar.png'
        })) ?? []
      }))
    );
  }

  deleteChat(chatId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${chatId}`);
  }

  markAsRead(chatId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${chatId}/read`, {});
  }

  markAsUnread(chatId: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${chatId}/unread`, {});
  }

  uploadGroupPhoto(chatId: number, file: File): Observable<ChatDto> {
    const formData = new FormData();
    formData.append('avatar', file, file.name);
    return this.http.post<ChatDto>(`${this.apiUrl}/${chatId}/avatar`, formData).pipe(
      map(chat => ({
        ...chat,
        avatarUrl: chat.avatarUrl
          ? `${environment.serverUrl}${chat.avatarUrl}`
          : 'assets/default-group.png',

        members: chat.members?.map(member => ({
          ...member,
          photoUrl: member.photoUrl
            ? `${environment.serverUrl}${member.photoUrl}`
            : 'assets/default-avatar.png'
        })) ?? []
      }))
    );
  }

  removeMemberFromGroup(chatId: number, memberId: number): Observable<ChatDto> {
    return this.http.post<ChatDto>(`${this.apiUrl}/${chatId}/remove-member`, { memberId }).pipe(
      map(chat => ({
        ...chat,
        avatarUrl: chat.avatarUrl
          ? `${environment.serverUrl}${chat.avatarUrl}`
          : 'assets/default-group.png',

        members: chat.members?.map(member => ({
          ...member,
          photoUrl: member.photoUrl
            ? `${environment.serverUrl}${member.photoUrl}`
            : 'assets/default-avatar.png'
        })) ?? []
      }))
    );
  }

  getTotalUnreadChatsCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/total-unread-count`).pipe(
      tap(count => {
        this.totalUnreadCountSubject.next(count);
      }),
      catchError(error => {
        return of(0);
      })
    );
  }

  sendMessage(chatId: number, content?: string, files?: File[]): Observable<ChatMessageDto> {
    const form = new FormData();

    if (content !== undefined && content !== null) {
      form.append('content', content);
    } else {
      form.append('content', '');
    }

    if (files && files.length) {
      files.forEach(file => {
        form.append('files', file, file.name);
      });
    }

    return this.http.post<ChatMessageDto>(`${this.apiUrl}/${chatId}/send`, form).pipe(
      map(msg => ({
        ...msg,
        senderAvatarUrl: msg.senderAvatarUrl
          ? `${environment.serverUrl}${msg.senderAvatarUrl}`
          : 'assets/default-avatar.png'
      }))
    );
  }

  public updateTotalUnreadBy(delta: number): void {
    const current = this.totalUnreadCountSubject.value ?? 0;
    const updated = Math.max(0, current + delta);
    this.totalUnreadCountSubject.next(updated);
  }

  public setTotalUnread(count: number): void {
    const safe = Math.max(0, count ?? 0);
    this.totalUnreadCountSubject.next(safe);
  }

  public getTotalUnreadValue(): number {
    return this.totalUnreadCountSubject.value ?? 0;
  }

  private mapMessageAvatar(msg: ChatMessageDto): ChatMessageDto {
    return {
      ...msg,
      senderAvatarUrl: msg.senderAvatarUrl
        ? `${environment.serverUrl}${msg.senderAvatarUrl}`
        : 'assets/default-avatar.png',

      file: msg.file
        ? {
          ...msg.file,
          url: `${environment.serverUrl}${msg.file.url}`
        }
        : undefined
    };
  }

  private mapChat(chat: ChatDto): ChatDto {
    return {
      ...chat,
      avatarUrl: chat.avatarUrl
        ? `${environment.serverUrl}${chat.avatarUrl}`
        : 'assets/default-avatar.png',

      members: chat.members?.map(m => ({
        ...m,
        photoUrl: m.photoUrl
          ? `${environment.serverUrl}${m.photoUrl}`
          : 'assets/default-avatar.png'
      })) ?? []
    };
  }

}
