import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import * as signalR from '@microsoft/signalr';
import { NotificationService } from './notification.service';
import { Notification } from '../../models/notification.model';
import { environment } from '../../../environments/environment';
import { installRealtimeHubStub, RealtimeHubStub } from '../../../testing/realtime-hub.stub';

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;
  let hub: RealtimeHubStub;
  let token: string | null;
  const base = `${environment.apiUrl}/notifications`;
  const unread: Notification = { id: 7, type: 'news', title: 'Campanha', message: 'Nova campanha', createdAt: '2026-11-10T10:00:00Z', isRead: false, link: '/noticias/7' };
  const read: Notification = { ...unread, id: 8, isRead: true };
  let counts: number[];

  beforeEach(() => {
    token = localStorage.getItem('jwt');
    localStorage.removeItem('jwt');
    vi.useFakeTimers();
    hub = installRealtimeHubStub();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    counts = [];
  });
  function inject(): NotificationService {
    service = TestBed.inject(NotificationService);
    service.unreadCount$.subscribe(count => counts.push(count));
    return service;
  }
  afterEach(() => {
    http.verify();
    token === null ? localStorage.removeItem('jwt') : localStorage.setItem('jwt', token);
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('loads current-user notifications and publishes only their unread count', () => {
    inject().getUserNotification().subscribe(notifications => expect(notifications).toEqual([unread, read]));
    const request = http.expectOne(`${base}/usernotifications`);
    expect(request.request.method).toBe('GET');
    request.flush([unread, read]);
    expect(counts).toEqual([0, 1]);
  });

  it('publishes incoming notifications and increments only unread ones', () => {
    inject();
    const received: Notification[] = [];
    const unsubscribe = service.onNotificationReceived(notification => received.push(notification));
    hub.emit('ReceiveNotification', unread);
    hub.emit('ReceiveNotification', read);
    expect(received).toEqual([unread, read]);
    expect(counts).toEqual([0, 1]);
    unsubscribe();
    hub.emit('ReceiveNotification', read);
    expect(received).toHaveLength(2);
  });

  it('refreshes unread count after server deletions and supports unsubscription', () => {
    inject();
    const deleted: number[][] = [];
    const unsubscribe = service.onNotificationsDeleted(ids => deleted.push(ids));
    hub.emit('NotificationsDeleted', [7, 8]);
    http.expectOne(`${base}/unread/count`).flush(4);
    expect(deleted).toEqual([[7, 8]]);
    expect(counts.at(-1)).toBe(4);
    unsubscribe();
    hub.emit('NotificationsDeleted', [9]);
    http.expectOne(`${base}/unread/count`).flush('offline', { status: 503, statusText: 'Unavailable' });
    expect(deleted).toEqual([[7, 8]]);
    expect(counts.at(-1)).toBe(4);
  });

  it('updates the counter after a successful read and never goes below zero', () => {
    inject();
    hub.emit('ReceiveNotification', unread);
    service.markAsRead(7).subscribe();
    const request = http.expectOne(`${base}/7/read`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({});
    expect(counts.at(-1)).toBe(1);
    request.flush(null);
    service.markAsRead(7).subscribe();
    http.expectOne(`${base}/7/read`).flush(null);
    expect(counts.slice(-2)).toEqual([0, 0]);
  });

  it('preserves the unread counter when marking a notification fails', () => {
    inject();
    hub.emit('ReceiveNotification', unread);
    let status: number | undefined;
    service.markAsRead(7).subscribe({ error: error => status = error.status });
    http.expectOne(`${base}/7/read`).flush('denied', { status: 403, statusText: 'Forbidden' });
    expect(status).toBe(403);
    expect(counts).toEqual([0, 1]);
  });

  it('decrements on removal only if the removed notification was unread', () => {
    inject();
    hub.emit('ReceiveNotification', unread);
    service.removeForCurrentUser(8).subscribe();
    const readRemoval = http.expectOne(`${base}/8/user`);
    expect(readRemoval.request.method).toBe('DELETE');
    readRemoval.flush(null);
    expect(counts.at(-1)).toBe(1);
    service.removeForCurrentUser(7, true).subscribe();
    http.expectOne(`${base}/7/user`).flush(null);
    expect(counts.at(-1)).toBe(0);
  });

  it('resets the counter after marking all notifications as read', () => {
    inject();
    hub.emit('ReceiveNotification', unread);
    service.markAllAsRead().subscribe();
    const request = http.expectOne(`${base}/read-all`);
    expect(request.request.method).toBe('PUT');
    request.flush(null);
    expect(counts.at(-1)).toBe(0);
  });

  it('clamps invalid unread counts returned by the server', () => {
    inject().getUnreadCount().subscribe(count => expect(count).toBe(-3));
    http.expectOne(`${base}/unread/count`).flush(-3);
    expect(counts.at(-1)).toBe(0);
  });

  it('retrieves all/unread lists and creates a notification using the API contract', () => {
    inject().getAll().subscribe(items => expect(items).toEqual([unread, read]));
    http.expectOne(base).flush([unread, read]);
    service.getUnread().subscribe(items => expect(items).toEqual([unread]));
    http.expectOne(`${base}/unread`).flush([unread]);
    service.create({ title: 'Campanha', message: 'Nova campanha' }).subscribe(notification => expect(notification).toEqual(unread));
    const request = http.expectOne(base);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ title: 'Campanha', message: 'Nova campanha' });
    request.flush(unread);
  });

  it('does not start or retry the hub without an authenticated session', async () => {
    inject();
    hub.closed();
    await vi.advanceTimersByTimeAsync(10000);
    expect(hub.start).not.toHaveBeenCalled();
    http.expectNone(() => true);
  });

  it('starts the authenticated connection and avoids parallel retry timers', async () => {
    localStorage.setItem('jwt', 'session');
    inject();
    await Promise.resolve();
    expect(hub.start).toHaveBeenCalledTimes(1);
    hub.state = signalR.HubConnectionState.Disconnected;
    hub.closed();
    hub.closed();
    await vi.advanceTimersByTimeAsync(4999);
    expect(hub.start).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();
    expect(hub.start).toHaveBeenCalledTimes(2);
  });

  it('retries a failed connection after five seconds', async () => {
    localStorage.setItem('jwt', 'session');
    hub.start.mockRejectedValueOnce(new Error('offline'));
    inject();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(5000);
    await Promise.resolve();
    expect(hub.start).toHaveBeenCalledTimes(2);
    expect(hub.state).toBe(signalR.HubConnectionState.Connected);
  });

  it('does not reconnect if the token was removed while waiting', async () => {
    localStorage.setItem('jwt', 'session');
    hub.start.mockRejectedValueOnce(new Error('offline'));
    inject();
    await Promise.resolve();
    localStorage.removeItem('jwt');
    await vi.advanceTimersByTimeAsync(5000);
    await Promise.resolve();
    expect(hub.start).toHaveBeenCalledTimes(1);
  });

  it('does not start an already connected hub', async () => {
    localStorage.setItem('jwt', 'session');
    hub.state = signalR.HubConnectionState.Connected;
    inject();
    await Promise.resolve();
    expect(hub.start).not.toHaveBeenCalled();
  });
});
