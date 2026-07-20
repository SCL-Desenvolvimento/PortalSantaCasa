import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notification } from '../../models/notification.model';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly hubConnection: signalR.HubConnection;
  private readonly apiUrl = `${environment.apiUrl}/notifications`;
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  constructor(private http: HttpClient) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.realtimeUrl}hub/notification`, {
        accessTokenFactory: () => localStorage.getItem('jwt') ?? ''
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.None)
      .build();

    this.hubConnection.onclose(() => this.scheduleReconnect());
    void this.startConnection();
  }

  getAll(): Observable<Notification[]> {
    return this.http.get<Notification[]>(this.apiUrl);
  }

  getUserNotification(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/usernotifications`);
  }

  getUnread(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/unread`);
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/unread/count`);
  }

  markAsRead(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}/read`, {});
  }

  removeForCurrentUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/user`);
  }

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read-all`, {});
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
    this.hubConnection.on('ReceiveNotification', callback);
    return () => this.hubConnection.off('ReceiveNotification', callback);
  }

  onNotificationsDeleted(callback: (notificationIds: number[]) => void): () => void {
    this.hubConnection.on('NotificationsDeleted', callback);
    return () => this.hubConnection.off('NotificationsDeleted', callback);
  }
}
