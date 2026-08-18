import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Notification } from '../../models/notification.model';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly hubConnection: signalR.HubConnection;
  private readonly apiUrl = `${environment.apiUrl}/notifications`;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private readonly unreadCountSubject = new BehaviorSubject<number>(0);
  private readonly notificationReceivedSubject = new Subject<Notification>();
  private readonly notificationsDeletedSubject = new Subject<number[]>();

  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.realtimeUrl}hub/notification`, {
        accessTokenFactory: () => localStorage.getItem('jwt') ?? ''
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    this.hubConnection.on('ReceiveNotification', (notification: Notification) => {
      if (!notification.isRead) {
        this.updateUnreadCount(this.unreadCountSubject.value + 1);
      }
      this.notificationReceivedSubject.next(notification);
    });

    this.hubConnection.on('NotificationsDeleted', (notificationIds: number[]) => {
      this.notificationsDeletedSubject.next(notificationIds);
      this.getUnreadCount().subscribe({ error: () => undefined });
    });

    this.hubConnection.onclose(() => this.scheduleReconnect());
    void this.startConnection();
  }

  getAll(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  getUserNotification(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/usernotifications`).pipe(
      tap(notifications => this.updateUnreadCount(notifications.filter(notification => !notification.isRead).length))
    );
  }

  getUnread(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/unread`);
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/unread/count`).pipe(
      tap(count => this.updateUnreadCount(count))
    );
  }

  markAsRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => this.updateUnreadCount(this.unreadCountSubject.value - 1))
    );
  }

  removeForCurrentUser(id: number, wasUnread = false): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/user`).pipe(
      tap(() => {
        if (wasUnread) {
          this.updateUnreadCount(this.unreadCountSubject.value - 1);
        }
      })
    );
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => this.updateUnreadCount(0))
    );
  }

  create(notification: Partial<Notification>): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification);
  }

  // =================== SignalR ===================

  private async startConnection(): Promise<void> {
    if (!localStorage.getItem('jwt') || this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      return;
    }

    try {
      await this.hubConnection.start();
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !localStorage.getItem('jwt')) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.startConnection();
    }, 5000);
  }

  onNotificationReceived(callback: (notification: Notification) => void): () => void {
    const subscription = this.notificationReceivedSubject.subscribe(callback);
    return () => subscription.unsubscribe();
  }

  onNotificationsDeleted(callback: (notificationIds: number[]) => void): () => void {
    const subscription = this.notificationsDeletedSubject.subscribe(callback);
    return () => subscription.unsubscribe();
  }

  private updateUnreadCount(count: number): void {
    this.unreadCountSubject.next(Math.max(0, count ?? 0));
  }
}
