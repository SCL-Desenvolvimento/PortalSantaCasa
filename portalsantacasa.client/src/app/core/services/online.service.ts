import { Injectable, NgZone, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Subject, finalize, map, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';

export interface OnlineUser {
  id: number;
  userName: string;
}

interface OnlineUserResponse {
  id?: number;
  Id?: number;
  userName?: string;
  username?: string;
  Username?: string;
}

@Injectable({ providedIn: 'root' })
export class OnlineService implements OnDestroy {
  private hubConnection?: signalR.HubConnection;
  private readonly hubUrl = `${environment.realtimeUrl}hub/presence`;
  public onlineUsers$ = new BehaviorSubject<OnlineUser[]>([]);
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private initializeTimer?: ReturnType<typeof setTimeout>;
  private connectionRequested = false;
  private readonly cancelRequests$ = new Subject<void>();
  private heartbeatPending = false;
  private onlineQueryPending = false;

  constructor(
    private ngZone: NgZone,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    // Iniciar conexão automaticamente se o usuário já estiver logado
    this.initializeConnection();
  }

  private initializeConnection(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.initializeTimer = setTimeout(() => {
      this.initializeTimer = undefined;

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
    if (!isPlatformBrowser(this.platformId)) return;
    // Se já existe conexão, não criar nova
    if (this.hubConnection && this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      return;
    }

    const actualToken = token || this.getToken();
    if (!actualToken) {
      return;
    }
    if (this.initializeTimer) {
      clearTimeout(this.initializeTimer);
      this.initializeTimer = undefined;
    }
    this.connectionRequested = true;

    // O heartbeat HTTP mantém a presença funcional mesmo durante uma
    // indisponibilidade transitória do serviço Realtime ou do Redis.
    if (!this.heartbeatInterval) this.startHeartbeat();

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
      .configureLogging(
        environment.production ? signalR.LogLevel.Error : signalR.LogLevel.Warning
      );

    const connection = builder.build();
    this.hubConnection = connection;

    // Configurar handlers de eventos
    this.setupHubHandlers();

    try {
      await connection.start();
      if (!this.connectionRequested || this.hubConnection !== connection) return;

      // Solicitar lista inicial de usuários online
      this.requestOnlineUsers();
    } catch (error) {
      if (!environment.production) {
        console.warn('Não foi possível conectar ao hub de presença.', error);
      }
      if (this.hubConnection === connection) this.scheduleReconnect();
    }
  }

  private setupHubHandlers() {
    const connection = this.hubConnection;
    if (!connection) return;

    // O SignalR apenas sinaliza que a presença mudou. A API é a fonte única
    // da lista para que uma resposta vazia do Redis não sobrescreva usuários
    // que acabaram de registrar o heartbeat HTTP.
    connection.on('UsersOnline', () => {
      if (this.hubConnection === connection) this.refreshOnlineViaHttp();
    });

    connection.onreconnected(() => {
      if (this.connectionRequested && this.hubConnection === connection) {
        this.startHeartbeat();
        this.requestOnlineUsers();
      }
    });

    connection.onclose(() => {
      if (this.hubConnection === connection && this.isLoggedIn()) this.scheduleReconnect();
    });
  }

  private startHeartbeat() {
    // Limpar intervalo anterior se existir
    this.stopHeartbeat();

    // Registra a presença imediatamente, sem aguardar o primeiro intervalo.
    void this.sendHeartbeat();

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
    if (!this.connectionRequested) return;
    if (!this.isLoggedIn()) {
      await this.stopConnection();
      return;
    }
    this.sendHttpHeartbeat();

    try {
      if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
        await this.hubConnection.invoke('Heartbeat');
      }
    } catch (error) {
      if (!environment.production) {
        console.warn('Não foi possível enviar o heartbeat pelo hub.', error);
      }
    }
  }

  async stopConnection() {
    this.connectionRequested = false;
    this.cancelRequests$.next();
    this.onlineUsers$.next([]);
    if (this.initializeTimer) {
      clearTimeout(this.initializeTimer);
      this.initializeTimer = undefined;
    }
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    const connection = this.hubConnection;
    this.hubConnection = undefined;
    try {
      await connection?.stop();
    } catch {
      // A conexão já pode ter sido encerrada pelo transporte.
    }
  }

  // Método para forçar atualização da lista
  requestOnlineUsers() {
    if (!this.connectionRequested) return;
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      void this.hubConnection.invoke('GetOnlineUsers').catch(() => undefined);
    }

    this.refreshOnlineViaHttp();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.connectionRequested || !this.isLoggedIn()) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.startConnection();
    }, 5000);
  }

  // Método HTTP para obter lista online
  getOnlineViaHttp() {
    return this.http
      .get<OnlineUserResponse[]>(`${environment.apiUrl}/user/online`)
      .pipe(
        map(users => users
          .map(user => ({
            id: Number(user.id ?? user.Id),
            userName: user.userName ?? user.username ?? user.Username ?? 'Usuário'
          }))
          .filter(user => Number.isInteger(user.id) && user.id > 0))
      );
  }

  private sendHttpHeartbeat(): void {
    if (this.heartbeatPending) return;
    this.heartbeatPending = true;
    this.http.post<void>(`${environment.apiUrl}/user/heartbeat`, {}).pipe(
      takeUntil(this.cancelRequests$),
      finalize(() => this.heartbeatPending = false)
    ).subscribe({
      next: () => this.refreshOnlineViaHttp(),
      error: error => {
        if (!environment.production) {
          console.warn('Não foi possível atualizar a presença pela API.', error);
        }
      }
    });
  }

  private refreshOnlineViaHttp(): void {
    if (!this.connectionRequested || this.onlineQueryPending) return;
    this.onlineQueryPending = true;
    this.getOnlineViaHttp().pipe(
      takeUntil(this.cancelRequests$),
      finalize(() => this.onlineQueryPending = false)
    ).subscribe({
      next: users => this.ngZone.run(() => this.onlineUsers$.next(users)),
      error: error => {
        if (!environment.production) {
          console.warn('Não foi possível consultar os usuários online pela API.', error);
        }
      }
    });
  }

  ngOnDestroy(): void {
    void this.stopConnection();
    this.cancelRequests$.complete();
  }
}
