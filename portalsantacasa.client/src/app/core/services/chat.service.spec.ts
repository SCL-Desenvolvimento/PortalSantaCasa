import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import * as signalR from '@microsoft/signalr';
import { ChatService } from './chat.service';
import { ChatDto, ChatMessageDto } from '../../models/chat.model';
import { environment } from '../../../environments/environment';
import { installRealtimeHubStub, RealtimeHubStub } from '../../../testing/realtime-hub.stub';

describe('ChatService', () => {
  let service: ChatService;
  let http: HttpTestingController;
  let hub: RealtimeHubStub;
  let previousToken: string | null;
  const base = `${environment.apiUrl}/Chat`;
  const chat: ChatDto = {
    id: 12, name: 'Equipe', avatarUrl: '/images/team.png', isGroup: true, isDepartmentChat: false,
    lastMessage: 'Olá', lastMessageTime: new Date('2026-11-10T10:00:00Z'), unreadCount: 2, unreadMessagesCount: 2, isDeleted: false,
    members: [{ id: 3, username: 'Maria', email: 'maria@example.com', department: 'TI', photoUrl: '/images/maria.png', isActive: true }]
  };
  const message: ChatMessageDto = {
    id: 7, chatId: 12, senderId: 3, replyToIsDeleted: false, senderName: 'Maria', senderUsername: 'maria',
    senderAvatarUrl: '/images/maria.png', messageType: 0, content: 'Olá', sentAt: new Date('2026-11-10T10:00:00Z'),
    isDeleted: false, isSent: true, reactions: [], file: { fileName: 'documento.pdf', url: '/uploads/documento.pdf', contentType: 'application/pdf', size: 64 }
  };
  beforeEach(() => {
    previousToken = localStorage.getItem('jwt');
    localStorage.removeItem('jwt');
    vi.useFakeTimers();
    hub = installRealtimeHubStub();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  function inject(): ChatService { return service = TestBed.inject(ChatService); }
  afterEach(() => {
    http.verify();
    previousToken === null ? localStorage.removeItem('jwt') : localStorage.setItem('jwt', previousToken);
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('filters deleted chats and normalizes member and chat images', () => {
    inject().getUserChats().subscribe(chats => {
      expect(chats).toHaveLength(2);
      expect(chats[0].avatarUrl).toBe(`${environment.serverUrl}/images/team.png`);
      expect(chats[0].members[0].photoUrl).toBe(`${environment.serverUrl}/images/maria.png`);
      expect(chats[1].avatarUrl).toBe('assets/default-avatar.png');
      expect(chats[1].members[0].photoUrl).toBe('assets/default-avatar.png');
    });
    http.expectOne(base).flush([chat, { ...chat, id: 13, avatarUrl: '', members: [{ ...chat.members[0], photoUrl: '' }] }, { ...chat, isDeleted: true }]);
  });

  it('tolerates a chat response with no members', () => {
    inject().getUserChats().subscribe(chats => expect(chats[0].members).toEqual([]));
    http.expectOne(base).flush([{ ...chat, members: null }]);
  });

  it('requests message pagination and makes relative attachment links absolute', () => {
    inject().getChatMessages(12, 10, 25).subscribe(messages => {
      expect(messages[0].senderAvatarUrl).toBe(`${environment.serverUrl}/images/maria.png`);
      expect(messages[0].file?.url).toBe(`${environment.serverUrl.replace(/\/+$/, '')}/uploads/documento.pdf`);
      expect(messages[1].senderAvatarUrl).toBe('assets/default-avatar.png');
      expect(messages[1].file).toBeUndefined();
    });
    const request = http.expectOne(req => req.url === `${base}/12/messages`);
    expect(request.request.params.get('skip')).toBe('10');
    expect(request.request.params.get('take')).toBe('25');
    request.flush([message, { ...message, id: 8, senderAvatarUrl: '', file: null }]);
  });

  it('uses the default message window and preserves remote attachment URLs', () => {
    inject().getChatMessages(12).subscribe(messages => expect(messages[0].file?.url).toBe('https://cdn.example.com/file.pdf'));
    const request = http.expectOne(req => req.url === `${base}/12/messages`);
    expect(request.request.params.get('skip')).toBe('0');
    expect(request.request.params.get('take')).toBe('500');
    request.flush([{ ...message, file: { ...message.file, url: 'https://cdn.example.com/file.pdf' } }]);
  });

  it('downloads attachments as blobs', () => {
    const attachment = new Blob(['document'], { type: 'application/pdf' });
    inject().getAttachment('/protected/file.pdf').subscribe(blob => expect(blob).toEqual(attachment));
    const request = http.expectOne('/protected/file.pdf');
    expect(request.request.responseType).toBe('blob');
    request.flush(attachment);
  });

  it('starts a direct chat using both user IDs and maps the returned members', () => {
    inject().startNewChat(3, 4).subscribe(value => {
      expect(value.avatarUrl).toBe(`${environment.serverUrl}/images/team.png`);
      expect(value.members[0].photoUrl).toBe(`${environment.serverUrl}/images/maria.png`);
    });
    const request = http.expectOne(`${base}/start`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ userId: 3, targetUserId: 4 });
    request.flush(chat);
  });

  it('supplies direct-chat image defaults and missing members', () => {
    inject().startNewChat(3, 4).subscribe(value => {
      expect(value.avatarUrl).toBe('assets/default-avatar.png');
      expect(value.members).toEqual([]);
    });
    http.expectOne(`${base}/start`).flush({ ...chat, avatarUrl: '', members: null });
  });

  it('starts a department chat and maps missing images', () => {
    inject().startDepartmentChat('Enfermagem').subscribe(value => {
      expect(value.avatarUrl).toBe('assets/default-avatar.png');
      expect(value.members[0].photoUrl).toBe('assets/default-avatar.png');
    });
    const request = http.expectOne(`${base}/department/start`);
    expect(request.request.body).toEqual({ targetDepartment: 'Enfermagem' });
    request.flush({ ...chat, avatarUrl: '', members: [{ ...chat.members[0], photoUrl: '' }] });
  });

  const groupOperations = [
    { name: 'creates a group', path: '/group', body: { creatorId: 3, groupName: 'Equipe', memberIds: [4] }, run: (s: ChatService) => s.createGroupChat(3, 'Equipe', [4]) },
    { name: 'adds group members', path: '/12/members', body: { chatId: 12, memberIds: [4] }, run: (s: ChatService) => s.addMembersToGroup(12, [4]) },
    { name: 'removes a group member without impersonating the caller', path: '/12/remove-member', body: { memberId: 4 }, run: (s: ChatService) => s.removeMemberFromGroup(12, 4) }
  ];
  for (const operation of groupOperations) {
    for (const hasImages of [true, false]) {
      it(`${operation.name} with ${hasImages ? 'server' : 'default'} images`, () => {
        operation.run(inject()).subscribe(value => {
          expect(value.avatarUrl).toBe(hasImages ? `${environment.serverUrl}/images/team.png` : 'assets/default-group.png');
          expect(value.members[0].photoUrl).toBe(hasImages ? `${environment.serverUrl}/images/maria.png` : 'assets/default-avatar.png');
        });
        const request = http.expectOne(`${base}${operation.path}`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual(operation.body);
        request.flush(hasImages ? chat : { ...chat, avatarUrl: '', members: [{ ...chat.members[0], photoUrl: '' }] });
      });
    }
  }

  it('uploads the group avatar as a named multipart file', () => {
    const file = new File(['image'], 'team.png', { type: 'image/png' });
    inject().uploadGroupPhoto(12, file).subscribe(value => {
      expect(value.avatarUrl).toBe(`${environment.serverUrl}/images/team.png`);
      expect(value.members[0].photoUrl).toBe(`${environment.serverUrl}/images/maria.png`);
    });
    const request = http.expectOne(`${base}/12/avatar`);
    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).get('avatar')).toEqual(file);
    request.flush(chat);
  });

  it('uses group avatar defaults if the upload response has no image', () => {
    inject().uploadGroupPhoto(12, new File(['image'], 'team.png')).subscribe(value => {
      expect(value.avatarUrl).toBe('assets/default-group.png');
      expect(value.members[0].photoUrl).toBe('assets/default-avatar.png');
    });
    http.expectOne(`${base}/12/avatar`).flush({ ...chat, avatarUrl: '', members: [{ ...chat.members[0], photoUrl: '' }] });
  });

  it('sends text, multiple files and a reply reference as multipart data', () => {
    const files = [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')];
    inject().sendMessage(12, 'Resposta', files, 7).subscribe(value => expect(value.senderAvatarUrl).toBe(`${environment.serverUrl}/images/maria.png`));
    const request = http.expectOne(`${base}/12/send`);
    expect(request.request.method).toBe('POST');
    const form = request.request.body as FormData;
    expect(form.get('content')).toBe('Resposta');
    expect(form.getAll('files')).toEqual(files);
    expect(form.get('replyToMessageId')).toBe('7');
    request.flush(message);
  });

  it('allows an empty message body without inventing files or reply IDs', () => {
    inject().sendMessage(12).subscribe(value => expect(value.senderAvatarUrl).toBe('assets/default-avatar.png'));
    const request = http.expectOne(`${base}/12/send`);
    const form = request.request.body as FormData;
    expect(form.get('content')).toBe('');
    expect(form.has('files')).toBe(false);
    expect(form.has('replyToMessageId')).toBe(false);
    request.flush({ ...message, senderAvatarUrl: '' });
  });

  it('keeps the unread count nonnegative through server refreshes and local changes', () => {
    inject().setTotalUnread(4);
    service.updateTotalUnreadBy(-10);
    expect(service.getTotalUnreadValue()).toBe(0);
    service.updateTotalUnreadBy(2);
    service.getTotalUnreadChatsCount().subscribe(count => expect(count).toBe(6));
    http.expectOne(`${base}/total-unread-count`).flush(6);
    expect(service.getTotalUnreadValue()).toBe(6);
    service.setTotalUnread(-1);
    expect(service.getTotalUnreadValue()).toBe(0);
  });

  it('returns a safe fallback on unread-count HTTP failure without overwriting last known count', () => {
    inject().setTotalUnread(4);
    service.getTotalUnreadChatsCount().subscribe(count => expect(count).toBe(0));
    http.expectOne(`${base}/total-unread-count`).flush('offline', { status: 503, statusText: 'Unavailable' });
    expect(service.getTotalUnreadValue()).toBe(4);
  });

  it('maps edited and deleted messages while preserving reaction updates', () => {
    inject().editMessage(12, 7, 'Corrigido').subscribe(value => {
      expect(value.content).toBe('Corrigido');
      expect(value.senderAvatarUrl).toBe(`${environment.serverUrl}/images/maria.png`);
      expect(value.file?.url).toContain('/uploads/documento.pdf');
    });
    const edit = http.expectOne(`${base}/12/messages/7`);
    expect(edit.request.method).toBe('PUT');
    expect(edit.request.body).toEqual({ content: 'Corrigido' });
    edit.flush({ ...message, content: 'Corrigido' });
    service.deleteMessage(12, 7).subscribe(value => {
      expect(value.isDeleted).toBe(true);
      expect(value.reactions).toEqual([]);
      expect(value.senderAvatarUrl).toBe('assets/default-avatar.png');
    });
    const deletion = http.expectOne(`${base}/12/messages/7`);
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush({ ...message, isDeleted: true, reactions: null, senderAvatarUrl: '', file: null });
    const reactions = [{ userId: 3, userName: 'Maria', emoji: '👍' }];
    service.toggleMessageReaction(12, 7, '👍').subscribe(value => expect(value).toEqual(reactions));
    const reaction = http.expectOne(`${base}/12/messages/7/reaction`);
    expect(reaction.request.method).toBe('PUT');
    expect(reaction.request.body).toEqual({ emoji: '👍' });
    reaction.flush(reactions);
  });

  it('targets the selected chat when deleting, marking read and marking unread', () => {
    inject().deleteChat(12).subscribe();
    const deletion = http.expectOne(`${base}/12`);
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush(null);
    for (const [path, operation] of [['read', () => service.markAsRead(12)], ['unread', () => service.markAsUnread(12)]] as const) {
      operation().subscribe();
      const request = http.expectOne(`${base}/12/${path}`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({});
      request.flush(null);
    }
  });

  it('delivers normalized realtime messages, chats and reaction events to consumers', () => {
    inject();
    let received: ChatMessageDto | null = null;
    let updated: ChatMessageDto | null = null;
    let newChat: ChatDto | null = null;
    let updatedChat: ChatDto | null = null;
    let reactionUpdate: unknown;
    service.messageReceived$.subscribe(value => received = value);
    service.messageUpdated$.subscribe(value => updated = value);
    service.newChat$.subscribe(value => newChat = value);
    service.chatUpdated$.subscribe(value => updatedChat = value);
    service.messageReactionsUpdated$.subscribe(value => reactionUpdate = value);
    hub.emit('ReceiveMessage', message);
    hub.emit('MessageUpdated', { ...message, senderAvatarUrl: '', file: undefined, reactions: undefined });
    hub.emit('NewChat', chat);
    hub.emit('ChatUpdated', { ...chat, avatarUrl: '', members: null });
    const reactions = { chatId: 12, messageId: 7, reactions: [{ userId: 3, userName: 'Maria', emoji: '👍' }] };
    hub.emit('MessageReactionsUpdated', reactions);
    hub.emit('UnreadCountUpdate', 8);
    expect(received!.file!.url).toContain('/uploads/documento.pdf');
    expect(received!.senderAvatarUrl).toBe(`${environment.serverUrl}/images/maria.png`);
    expect(updated!.reactions).toEqual([]);
    expect(updated!.senderAvatarUrl).toBe('assets/default-avatar.png');
    expect(newChat!.members[0].photoUrl).toBe(`${environment.serverUrl}/images/maria.png`);
    expect(updatedChat!.members).toEqual([]);
    expect(updatedChat!.avatarUrl).toBe('assets/default-avatar.png');
    expect(reactionUpdate).toEqual(reactions);
    expect(service.getTotalUnreadValue()).toBe(8);
  });

  it('stays disconnected without a token and does not schedule reconnection', async () => {
    inject();
    const states: string[] = [];
    service.connectionState$.subscribe(state => states.push(state));
    hub.closed();
    await vi.advanceTimersByTimeAsync(10000);
    expect(states).toEqual(['disconnected', 'disconnected']);
    expect(hub.start).not.toHaveBeenCalled();
    http.expectNone(() => true);
  });

  it('refreshes unread state on connection and reconnection', async () => {
    localStorage.setItem('jwt', 'session');
    inject();
    const states: string[] = [];
    service.connectionState$.subscribe(state => states.push(state));
    await Promise.resolve();
    http.expectOne(`${base}/total-unread-count`).flush(3);
    hub.reconnecting();
    hub.reconnected();
    http.expectOne(`${base}/total-unread-count`).flush(5);
    expect(states).toEqual(['disconnected', 'connected', 'reconnecting', 'connected']);
    expect(service.getTotalUnreadValue()).toBe(5);
  });

  it('retries failed starts once per five-second interval', async () => {
    localStorage.setItem('jwt', 'session');
    hub.start.mockRejectedValueOnce(new Error('offline'));
    inject();
    await Promise.resolve();
    hub.closed();
    await vi.advanceTimersByTimeAsync(4999);
    expect(hub.start).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();
    http.expectOne(`${base}/total-unread-count`).flush(2);
    expect(hub.start).toHaveBeenCalledTimes(2);
    expect(service.getTotalUnreadValue()).toBe(2);
  });

  it('abandons a pending reconnect when the session is removed', async () => {
    localStorage.setItem('jwt', 'session');
    hub.start.mockRejectedValueOnce(new Error('offline'));
    inject();
    await Promise.resolve();
    localStorage.removeItem('jwt');
    await vi.advanceTimersByTimeAsync(5000);
    expect(hub.start).toHaveBeenCalledTimes(1);
    http.expectNone(() => true);
  });

  it('does not restart an already connected transport', async () => {
    localStorage.setItem('jwt', 'session');
    hub.state = signalR.HubConnectionState.Connected;
    inject();
    await Promise.resolve();
    expect(hub.start).not.toHaveBeenCalled();
  });

  it('waits to join until connected and leaves only while connected', async () => {
    inject();
    let joined = false;
    void service.joinChatGroup(12).then(() => joined = true);
    void service.leaveChatGroup(12);
    await Promise.resolve();
    expect(hub.invoke).not.toHaveBeenCalled();
    expect(joined).toBe(false);
    hub.state = signalR.HubConnectionState.Connected;
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.resolve();
    expect(joined).toBe(true);
    expect(hub.invoke).toHaveBeenCalledWith('JoinChat', 12);
    void service.leaveChatGroup(12);
    await Promise.resolve();
    expect(hub.invoke).toHaveBeenCalledWith('LeaveChat', 12);
  });
});
