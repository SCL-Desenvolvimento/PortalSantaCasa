import { Component, EventEmitter, HostListener, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { SearchService, SearchResult } from '../../../core/services/search.service';
import { Notification } from '../../../models/notification.model';
import { User } from '../../../models/user.model';
import { Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Interface local para compatibilidade com o template existente
interface LocalNotification {
  id: string;
  title: string;
  message: string;
  time: Date;
  read: boolean;
  icon: string;
  color: string;
}
@Component({
  selector: 'app-admin-header',
  standalone: false,
  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.css'
})
export class AdminHeaderComponent implements OnInit, OnDestroy {
  @Output() onLogout = new EventEmitter<void>();

  // Estados
  searchQuery = '';
  searchResults: SearchResult[] = [];
  showNotifications = false;
  showUserMenu = false;
  isDarkMode = false;
  isSearching = false;

  // Dados do usuário
  userName = 'Administrador';
  userRole = 'Admin';
  userAvatar = '';

  // Notificações
  notificationCount = 0;
  notifications: LocalNotification[] = [];
  private notificationSubscription?: Subscription;
  private signalRSubscription?: Subscription;

  // Busca
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  constructor(
    private router: Router,
    private notificationService: NotificationService,
    private authService: AuthService,
    private userService: UserService,
    private searchService: SearchService
  ) { }

  ngOnInit(): void {
    this.loadUserData();
    this.loadNotifications();
    this.setupSignalRConnection();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
    if (this.signalRSubscription) {
      this.signalRSubscription.unsubscribe();
    }
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    this.searchSubject.complete();
  }

  private loadUserData(): void {
    // Primeiro, tentar obter dados do JWT
    const userInfo = this.authService.getUserInfo();
    if (userInfo) {
      this.userName = userInfo.username || 'Administrador';
      this.userRole = this.formatUserRole(userInfo.role) || 'Admin';

      // Buscar dados completos do usuário pelo ID
      if (userInfo.id) {
        this.userService.getUserById(userInfo.id).subscribe({
          next: (user: User) => {
            this.userName = user.username || this.userName;
            this.userRole = this.formatUserRole(user.userType) || this.userRole;
            this.userAvatar = `${environment.serverUrl}${user.photoUrl}` || '';
          },
          error: (error) => {
            console.error('Erro ao carregar dados do usuário:', error);
            // Manter dados do JWT em caso de erro
          }
        });
      }
    } else {
      // Fallback para dados padrão se não houver JWT
      this.userName = 'Administrador';
      this.userRole = 'Admin';
      this.userAvatar = '';
    }
  }

  private formatUserRole(role: string): string {
    const roleMap: { [key: string]: string } = {
      'admin': 'Administrador',
      'user': 'Usuário',
      'manager': 'Gerente',
      'employee': 'Funcionário',
      'guest': 'Convidado'
    };
    return roleMap[role?.toLowerCase()] || role || 'Admin';
  }

  private loadNotifications(): void {
    this.notificationSubscription = this.notificationService.getUserNotification().subscribe({
      next: (notifications: Notification[]) => {
        this.notifications = this.mapNotifications(notifications);
        this.updateNotificationCount();
      },
      error: (error) => {
        console.error('Erro ao carregar notificações:', error);
      }
    });
  }

  private setupSignalRConnection(): void {
    this.notificationService.onNotificationReceived((notification: Notification) => {
      const localNotification = this.mapNotification(notification);
      this.notifications.unshift(localNotification);
      this.updateNotificationCount();
    });
  }

  private mapNotifications(notifications: Notification[]): LocalNotification[] {
    return notifications.map(notification => this.mapNotification(notification));
  }

  private mapNotification(notification: Notification): LocalNotification {
    return {
      id: notification.id.toString(),
      title: notification.title,
      message: notification.message,
      time: new Date(notification.createdAt),
      read: notification.isRead,
      icon: this.getNotificationIcon(notification.type),
      color: this.getNotificationColor(notification.type)
    };
  }

  private getNotificationIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'news': 'fas fa-newspaper',
      'birthday': 'fas fa-birthday-cake',
      'menu': 'fas fa-utensils',
      'event': 'fas fa-calendar-alt',
      'document': 'fas fa-file-alt',
      'system': 'fas fa-cog',
      'user': 'fas fa-user',
      'default': 'fas fa-bell'
    };
    return iconMap[type] || iconMap['default'];
  }

  private getNotificationColor(type: string): string {
    const colorMap: { [key: string]: string } = {
      'news': '#1a8dc3',
      'birthday': '#f59e0b',
      'menu': '#10b981',
      'event': '#8b5cf6',
      'document': '#06b6d4',
      'system': '#6b7280',
      'user': '#22BCEE',
      'default': '#6b7280'
    };
    return colorMap[type] || colorMap['default'];
  }

  private setupSearch(): void {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300), // Aguarda 300ms após o usuário parar de digitar
      distinctUntilChanged(), // Só executa se o valor mudou
      switchMap(query => {
        if (!query || query.trim().length < 2) {
          this.isSearching = false;
          return of([]);
        }
        this.isSearching = true;
        return this.searchService.search(query);
      })
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Erro na busca:', error);
        this.searchResults = [];
        this.isSearching = false;
      }
    });
  }

  // ===== BUSCA =====
  onSearch(event: any): void {
    const query = event.target.value;
    this.searchQuery = query;

    // Enviar para o subject que irá processar com debounce
    this.searchSubject.next(query);
  }

  onSearchResultClick(result: SearchResult): void {
    this.closeAllMenus();
    if (result.url) {
      this.router.navigate([result.url]);
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    // Ctrl+K para focar na busca
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      const searchInput = document.querySelector('.search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }

    // Escape para fechar menus
    if (event.key === 'Escape') {
      this.closeAllMenus();
    }
  }

  // ===== NOTIFICAÇÕES =====
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false;
  }

  clearAllNotifications(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications = this.notifications.map(n => ({ ...n, read: true }));
        this.updateNotificationCount();
      },
      error: (error) => {
        console.error('Erro ao marcar todas as notificações como lidas:', error);
      }
    });
  }

  dismissNotification(id: string): void {
    // Marcar como lida no backend antes de remover
    this.notificationService.markAsRead(parseInt(id)).subscribe({
      next: () => {
        // Remover da lista local após sucesso no backend
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.updateNotificationCount();
      },
      error: (error) => {
        console.error('Erro ao dispensar notificação:', error);
        // Remover localmente mesmo em caso de erro para melhor UX
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.updateNotificationCount();
      }
    });
  }

  private updateNotificationCount(): void {
    this.notificationCount = this.notifications.filter(n => !n.read).length;
  }

  // ===== MENU DO USUÁRIO =====
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  viewProfile(): void {
    this.closeAllMenus();
    console.log('Funcionalidade em desenvolvimento');
  }

  openSettings(): void {
    this.closeAllMenus();
    console.log('Funcionalidade em desenvolvimento');
  }

  openHelp(): void {
    this.closeAllMenus();
    console.log('Funcionalidade em desenvolvimento');
  }

  logout(): void {
    this.closeAllMenus();
    this.authService.logout();
  }

  goToPublicIntranet(): void {
    this.closeAllMenus();
    this.router.navigate(['/']);
  }

  // ===== AÇÕES RÁPIDAS =====
  openQuickActions(): void {
    console.log('Ações rápidas em desenvolvimento');
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    // Aqui você implementaria a lógica de tema
    console.log(`Tema ${this.isDarkMode ? 'escuro' : 'claro'} ativado`);
  }

  // ===== UTILITÁRIOS =====
  closeAllMenus(): void {
    this.showNotifications = false;
    this.showUserMenu = false;
    this.searchResults = [];
    this.searchQuery = '';
  }
}
