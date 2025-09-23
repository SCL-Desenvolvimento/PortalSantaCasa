import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Notification } from '../models/notification.model';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private hubConnection!: signalR.HubConnection;
  private apiUrl = `${environment.apiUrl}/notifications`

  constructor(private http: HttpClient) {
    this.startConnection();
  }

  getAll(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}`);
  }

  getUnread(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/unread`);
  }

  markAsRead(id: number) {
    return this.http.put(`${this.apiUrl}/${id}/read`, {});
  }

  create(notification: Partial<Notification>) {
    return this.http.post<Notification>(`${this.apiUrl}`, notification);
  }

  private startConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.serverUrl}hub/notifications`)
      .withAutomaticReconnect()
      .build();

    this.hubConnection.start().catch(err => console.error(err));
  }

  onNotificationReceived(callback: (notification: Notification) => void) {
    this.hubConnection.on('ReceiveNotification', callback);
  }
}
