import { Injectable, NgZone, Inject, PLATFORM_ID } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

export interface OnlineUser {
  id: number;
  userName: string;
}

@Injectable({ providedIn: 'root' })
export class OnlineService {
  private hubConnection?: signalR.HubConnection;
  private readonly hubUrl = `${environment.realtimeUrl}hub/presence`;
  public onlineUsers$ = new BehaviorSubject<OnlineUser[]>([]);
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private ngZone: NgZone,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    // Iniciar conexão automaticamente se o usuário já estiver logado
    this.initializeConnection();
  }

  private async initializeConnection() {
    if (!isPlatformBrowser(this.platformId)) return;

    setTimeout(() => {

      const alreadyConnecting =
        this.hubConnection &&
        this.hubConnection.state !== signalR.HubConnectionState.Disconnected;

      if (this.isLoggedIn() && !alreadyConnecting) {
        this.startConnection();
      }

    }, 1000);
  }

  private isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return !!localStorage.getItem('jwt');
  }

  private getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem('jwt');
  }

  async startConnection(token?: string) {
    // Se já existe conexão, não criar nova
    if (this.hubConnection && this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      return;
    }

    const actualToken = token || this.getToken();
    if (!actualToken) {
      return;
    }

    const builder = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.getToken() || actualToken
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          if (retryContext.previousRetryCount === 10) {
            return null; // Stop retrying after 10 attempts
          }
          return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
        }
      })
      .configureLogging(signalR.LogLevel.None);

    this.hubConnection = builder.build();

    // Configurar handlers de eventos
    this.setupHubHandlers();

    try {
      await this.hubConnection.start();

      // Iniciar heartbeat
      this.startHeartbeat();

      // Solicitar lista inicial de usuários online
      this.requestOnlineUsers();
    } catch {
      this.scheduleReconnect();
    }
  }

  private setupHubHandlers() {
    if (!this.hubConnection) return;

    // Evento quando backend envia lista de online
    this.hubConnection.on('UsersOnline', (users: any[]) => {
      this.ngZone.run(() => {
        const formattedUsers = users.map(u => ({
          id: u.id || u.Id,
          userName: u.userName || u.username || u.Username || `User ${u.id}`
        }));
        this.onlineUsers$.next(formattedUsers);
      });
    });

    this.hubConnection.onreconnecting(() => {
      this.stopHeartbeat();
    });

    this.hubConnection.onreconnected(() => {
      this.startHeartbeat();
      this.requestOnlineUsers();
    });

    this.hubConnection.onclose(() => {
      this.stopHeartbeat();
      if (this.isLoggedIn()) this.scheduleReconnect();
    });
  }

  private startHeartbeat() {
    // Limpar intervalo anterior se existir
    this.stopHeartbeat();

    // Enviar heartbeat a cada 30 segundos
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private async sendHeartbeat() {
    try {
      if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
        await this.hubConnection.invoke('Heartbeat');
      }
    } catch {
      // A reconexão automática cuidará de uma indisponibilidade transitória.
    }
  }

  async stopConnection() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    try {
      await this.hubConnection?.stop();
      this.onlineUsers$.next([]);
    } catch {
      // A conexão já pode ter sido encerrada pelo transporte.
    }
  }

  // Método para forçar atualização da lista
  requestOnlineUsers() {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      void this.hubConnection.invoke('GetOnlineUsers').catch(() => undefined);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.isLoggedIn()) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.startConnection();
    }, 5000);
  }

  // Método HTTP para obter lista online
  getOnlineViaHttp() {
    return this.http.get<OnlineUser[]>(`${environment.apiUrl}/user/online`);
  }
}
