import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notification } from '../../models/notification.model';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private hubConnection!: signalR.HubConnection;
  private apiUrl = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {
    this.startConnection();
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

  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/read-all`, {});
  }

  create(notification: Partial<Notification>): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification);
  }

  // =================== SignalR ===================

  private startConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.serverUrl}hub/notifications`, {
        accessTokenFactory: () => localStorage.getItem('jwt') ?? ""
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start()
      .then(() => console.log('SignalR Connected'))
      .catch(err => console.error('SignalR Connection Error: ', err));
  }

  onNotificationReceived(callback: (notification: Notification) => void) {
    this.hubConnection.on('ReceiveNotification', callback);
  }
}
