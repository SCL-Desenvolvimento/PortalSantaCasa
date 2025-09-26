import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { SocialAccount } from '../../models/social-account.model';

export interface AuthToken {
  id: number;
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  isActive: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface SocialAccountResponse {
  success: boolean;
  data: SocialAccount[];
  message?: string;
}

export interface AuthTokenResponse {
  success: boolean;
  data: AuthToken[];
  message?: string;
}

export interface AuthenticationResponse {
  success: boolean;
  data: {
    authUrl?: string;
    token?: AuthToken;
    account?: SocialAccount;
  };
  message?: string;
}

export interface SocialProviderConfig {
  name: string;
  displayName: string;
  icon: string;
  color: string;
  isEnabled: boolean;
  authUrl: string;
  scopes: string[];
}

export interface ConnectionStatus {
  provider: string;
  isConnected: boolean;
  accountInfo?: {
    id: string;
    name: string;
    username: string;
    profilePicture?: string;
  };
  lastSync?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocialService {
  private apiUrl = 'http://localhost:5000/api'; // Ajustar conforme necessário

  // Subject para notificar mudanças no status de conexão
  private connectionStatusSubject = new BehaviorSubject<ConnectionStatus[]>([]);
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadConnectionStatus();
  }

  // =====================
  // 📌 Social Accounts Management
  // =====================

  /**
   * Obter todas as contas sociais do usuário
   */
  getSocialAccounts(): Observable<SocialAccount[]> {
    return this.http.get<SocialAccountResponse>(`${this.apiUrl}/social-accounts`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error('Erro ao obter contas sociais');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obter conta social específica por ID
   */
  getSocialAccountById(id: number): Observable<SocialAccount> {
    return this.http.get<{ success: boolean; data: SocialAccount }>(`${this.apiUrl}/social-accounts/${id}`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error('Conta social não encontrada');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obter contas por provedor
   */
  getAccountsByProvider(provider: string): Observable<SocialAccount[]> {
    const params = new HttpParams().set('provider', provider);

    return this.http.get<SocialAccountResponse>(`${this.apiUrl}/social-accounts/provider`, { params })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(`Erro ao obter contas do ${provider}`);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Criar nova conta social
   */
  createSocialAccount(accountData: FormData): Observable<SocialAccount> {
    return this.http.post<{ success: boolean; data: SocialAccount }>(`${this.apiUrl}/social-accounts`, accountData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.loadConnectionStatus(); // Atualizar status de conexão
            return response.data;
          }
          throw new Error('Erro ao criar conta social');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Atualizar conta social
   */
  updateSocialAccount(id: number, accountData: FormData): Observable<SocialAccount> {
    return this.http.put<{ success: boolean; data: SocialAccount }>(`${this.apiUrl}/social-accounts/${id}`, accountData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.loadConnectionStatus(); // Atualizar status de conexão
            return response.data;
          }
          throw new Error('Erro ao atualizar conta social');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Excluir conta social
   */
  deleteSocialAccount(id: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl}/social-accounts/${id}`)
      .pipe(
        tap(() => this.loadConnectionStatus()), // Atualizar status de conexão
        catchError(this.handleError)
      );
  }

  // =====================
  // 📌 Authentication Management
  // =====================

  /**
   * Obter todos os tokens de autenticação
   */
  getAuthTokens(): Observable<AuthToken[]> {
    return this.http.get<AuthTokenResponse>(`${this.apiUrl}/auth-tokens`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error('Erro ao obter tokens de autenticação');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obter tokens por provedor
   */
  getTokensByProvider(provider: string): Observable<AuthToken[]> {
    const params = new HttpParams().set('provider', provider);

    return this.http.get<AuthTokenResponse>(`${this.apiUrl}/auth-tokens/provider`, { params })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(`Erro ao obter tokens do ${provider}`);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Iniciar autenticação com provedor
   */
  authenticateProvider(provider: string): Observable<AuthenticationResponse> {
    return this.http.get<AuthenticationResponse>(`${this.apiUrl}/auth/login/${provider}`)
      .pipe(
        tap(response => {
          if (response.success) {
            this.loadConnectionStatus(); // Atualizar status de conexão
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Finalizar autenticação com código de autorização
   */
  completeAuthentication(provider: string, code: string, state?: string): Observable<AuthenticationResponse> {
    const formData = new FormData();
    formData.append('code', code);
    if (state) {
      formData.append('state', state);
    }

    return this.http.post<AuthenticationResponse>(`${this.apiUrl}/auth/callback/${provider}`, formData)
      .pipe(
        tap(response => {
          if (response.success) {
            this.loadConnectionStatus(); // Atualizar status de conexão
          }
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Renovar token de acesso
   */
  refreshToken(provider: string, refreshToken: string): Observable<AuthToken> {
    const formData = new FormData();
    formData.append('refreshToken', refreshToken);

    return this.http.post<{ success: boolean; data: AuthToken }>(`${this.apiUrl}/auth/refresh/${provider}`, formData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error('Erro ao renovar token');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Revogar autenticação
   */
  revokeAuthentication(provider: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl}/auth/revoke/${provider}`)
      .pipe(
        tap(() => this.loadConnectionStatus()), // Atualizar status de conexão
        catchError(this.handleError)
      );
  }

  // =====================
  // 📌 Provider Configuration
  // =====================

  /**
   * Obter configurações dos provedores disponíveis
   */
  getProviderConfigs(): Observable<SocialProviderConfig[]> {
    return this.http.get<{ success: boolean; data: SocialProviderConfig[] }>(`${this.apiUrl}/providers/config`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error('Erro ao obter configurações dos provedores');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obter configuração específica de um provedor
   */
  getProviderConfig(provider: string): Observable<SocialProviderConfig> {
    return this.http.get<{ success: boolean; data: SocialProviderConfig }>(`${this.apiUrl}/providers/config/${provider}`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(`Configuração do ${provider} não encontrada`);
        }),
        catchError(this.handleError)
      );
  }

  // =====================
  // 📌 Connection Status
  // =====================

  /**
   * Verificar status de conexão de todos os provedores
   */
  getConnectionStatus(): Observable<ConnectionStatus[]> {
    return this.http.get<{ success: boolean; data: ConnectionStatus[] }>(`${this.apiUrl}/connection/status`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error('Erro ao obter status de conexão');
        }),
        tap(status => this.connectionStatusSubject.next(status)),
        catchError(this.handleError)
      );
  }

  /**
   * Verificar status de conexão de um provedor específico
   */
  getProviderConnectionStatus(provider: string): Observable<ConnectionStatus> {
    return this.http.get<{ success: boolean; data: ConnectionStatus }>(`${this.apiUrl}/connection/status/${provider}`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(`Erro ao obter status de conexão do ${provider}`);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Testar conexão com provedor
   */
  testConnection(provider: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/connection/test/${provider}`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  // =====================
  // 📌 Account Synchronization
  // =====================

  /**
   * Sincronizar dados da conta com o provedor
   */
  syncAccount(provider: string): Observable<{ success: boolean; data: SocialAccount; message?: string }> {
    return this.http.post<{ success: boolean; data: SocialAccount; message?: string }>(`${this.apiUrl}/sync/${provider}`, {})
      .pipe(
        tap(() => this.loadConnectionStatus()), // Atualizar status de conexão
        catchError(this.handleError)
      );
  }

  /**
   * Sincronizar todas as contas
   */
  syncAllAccounts(): Observable<{ success: boolean; results: any[]; message?: string }> {
    return this.http.post<{ success: boolean; results: any[]; message?: string }>(`${this.apiUrl}/sync/all`, {})
      .pipe(
        tap(() => this.loadConnectionStatus()), // Atualizar status de conexão
        catchError(this.handleError)
      );
  }

  // =====================
  // 📌 Analytics and Insights
  // =====================

  /**
   * Obter estatísticas das contas sociais
   */
  getAccountStatistics(): Observable<{
    totalAccounts: number;
    connectedAccounts: number;
    activeAccounts: number;
    providerBreakdown: { [provider: string]: number };
  }> {
    return this.http.get<{
      success: boolean;
      data: {
        totalAccounts: number;
        connectedAccounts: number;
        activeAccounts: number;
        providerBreakdown: { [provider: string]: number };
      };
    }>(`${this.apiUrl}/statistics/accounts`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error('Erro ao obter estatísticas das contas');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obter insights de performance por provedor
   */
  getProviderInsights(provider: string, dateRange?: { start: string; end: string }): Observable<{
    totalPosts: number;
    totalEngagement: number;
    averageEngagement: number;
    topPerformingPosts: any[];
  }> {
    let params = new HttpParams();
    if (dateRange) {
      params = params.set('start', dateRange.start).set('end', dateRange.end);
    }

    return this.http.get<{
      success: boolean;
      data: {
        totalPosts: number;
        totalEngagement: number;
        averageEngagement: number;
        topPerformingPosts: any[];
      };
    }>(`${this.apiUrl}/insights/${provider}`, { params })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(`Erro ao obter insights do ${provider}`);
        }),
        catchError(this.handleError)
      );
  }

  // =====================
  // 📌 Utility Methods
  // =====================

  /**
   * Verificar se um provedor está conectado
   */
  isProviderConnected(provider: string): Observable<boolean> {
    return this.getProviderConnectionStatus(provider)
      .pipe(
        map(status => status.isConnected),
        catchError(() => [false])
      );
  }

  /**
   * Obter lista de provedores conectados
   */
  getConnectedProviders(): Observable<string[]> {
    return this.getConnectionStatus()
      .pipe(
        map(statuses => statuses.filter(s => s.isConnected).map(s => s.provider))
      );
  }

  /**
   * Validar configuração de conta social
   */
  validateAccountConfig(formData: FormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const provider = formData.get('provider') as string;
    const accountId = formData.get('accountId') as string;

    if (!provider || provider.trim().length === 0) {
      errors.push('Provedor é obrigatório');
    }

    if (!accountId || accountId.trim().length === 0) {
      errors.push('ID da conta é obrigatório');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // =====================
  // 📌 Private Methods
  // =====================

  /**
   * Carregar status de conexão e atualizar subject
   */
  private loadConnectionStatus(): void {
    this.getConnectionStatus().subscribe({
      next: (status) => {
        this.connectionStatusSubject.next(status);
      },
      error: (error) => {
        console.error('Erro ao carregar status de conexão:', error);
      }
    });
  }

  /**
   * Manipulador de erros centralizado
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Erro desconhecido';

    if (error.error instanceof ErrorEvent) {
      // Erro do lado do cliente
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      // Erro do lado do servidor
      if (error.status === 0) {
        errorMessage = 'Não foi possível conectar ao servidor';
      } else if (error.status === 401) {
        errorMessage = 'Não autorizado. Verifique suas credenciais';
      } else if (error.status === 403) {
        errorMessage = 'Acesso negado. Permissões insuficientes';
      } else if (error.status === 404) {
        errorMessage = 'Recurso não encontrado';
      } else if (error.status === 422) {
        errorMessage = error.error?.message || 'Dados inválidos';
      } else if (error.status === 429) {
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
      } else if (error.status === 500) {
        errorMessage = 'Erro interno do servidor';
      } else {
        errorMessage = error.error?.message || `Erro ${error.status}: ${error.statusText}`;
      }
    }

    console.error('SocialService Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
