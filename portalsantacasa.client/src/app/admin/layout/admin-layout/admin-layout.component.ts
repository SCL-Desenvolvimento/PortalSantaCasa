import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { SidebarConfigService, SidebarPermissions } from '../../components/admin-sidebar/sidebar-config.service';
import { AdminSidebarComponent } from '../../components/admin-sidebar/admin-sidebar.component';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
}

@Component({
  selector: 'app-admin-layout',
  standalone: false,
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  @ViewChild(AdminSidebarComponent) sidebar!: AdminSidebarComponent;

  private destroy$ = new Subject<void>();

  sidebarCollapsed = false;
  userInfo: string = '';
  canConfigureSidebar = false;
  showBreadcrumb = true;
  currentPageTitle = '';
  notifications: Notification[] = [];

  constructor(
    private authService: AuthService,
    private sidebarConfigService: SidebarConfigService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.userInfo = this.authService.getUserInfo('username') ?? '';
    this.initializeSidebar();
    this.checkUserPermissions();
    this.subscribeToRouterEvents();
    this.loadSavedPreferences();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    this.authService.logout();
  }

  onSidebarToggle(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
    // Salva a preferência do usuário no localStorage
    localStorage.setItem('sidebar-collapsed', collapsed.toString());
  }

  onNavigationChange(itemId: string): void {
    console.log('Navegando para:', itemId);
    this.updatePageTitle(itemId);

    // Aqui você pode adicionar lógica para:
    // - Atualizar breadcrumbs
    // - Enviar analytics
    // - Atualizar estado da aplicação
    // - Carregar dados específicos da página
  }

  /**
   * Subscreve aos eventos do router para atualizar o título da página
   */
  private subscribeToRouterEvents(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updatePageTitleFromRoute();
    });
  }

  /**
   * Atualiza o título da página baseado na rota atual
   */
  private updatePageTitleFromRoute(): void {
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }

    route.data.subscribe(data => {
      this.currentPageTitle = data['title'] || '';
    });
  }

  /**
   * Atualiza o título da página baseado no item do sidebar
   */
  private updatePageTitle(itemId: string): void {
    const titleMap: { [key: string]: string } = {
      'dashboard': 'Dashboard',
      'news': 'Gerenciar Notícias',
      'qualityMinute': 'Minuto de Qualidade',
      'events': 'Gerenciar Eventos',
      'birthdays': 'Gerenciar Aniversários',
      'banners': 'Gerenciar Banners',
      'menu': 'Gerenciar Cardápio',
      'feedbacks': 'Gerenciar Feedbacks',
      'documents': 'Gerenciar Documentos',
      'users': 'Gerenciar Usuários',
      'home': 'Início',
      'chat': 'Chat',
      'video-lessons': 'Video Aulas'
    };

    this.currentPageTitle = titleMap[itemId] || '';
  }

  /**
   * Carrega preferências salvas do usuário
   */
  private loadSavedPreferences(): void {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed) {
      this.sidebarCollapsed = savedCollapsed === 'true';
    }

    const savedBreadcrumb = localStorage.getItem('show-breadcrumb');
    if (savedBreadcrumb) {
      this.showBreadcrumb = savedBreadcrumb === 'true';
    }
  }

  /**
   * Inicializa o sidebar com configurações personalizadas
   */
  private initializeSidebar(): void {
    // Resetar a configuração do sidebar para o padrão antes de adicionar itens dinâmicos
    this.sidebarConfigService.resetToDefault();
    // Configurações baseadas no perfil do usuário
    const userRole = this.getUserRole();

    // Adiciona funcionalidades baseadas no papel do usuário
    if (userRole === 'admin' || userRole === 'manager') {
      this.sidebarConfigService.addReportsArea();
    }

    // Adiciona chat para todos os usuários
    this.sidebarConfigService.addChatArea();

    // Adiciona videoaulas se o usuário tem acesso
    if (this.hasVideoLessonsAccess()) {
      this.sidebarConfigService.addVideoLessonsArea();
    }

    // Configurações específicas da empresa
    this.addCompanySpecificModules();
  }

  /**
   * Adiciona módulos específicos da empresa
   */
  private addCompanySpecificModules(): void {
    // Exemplo: adicionar módulos baseados na configuração da empresa
    // Isso pode vir de uma API ou configuração

    // Simula dados de módulos disponíveis
    const availableModules = this.getAvailableModules();

    availableModules.forEach(module => {
      if (module.enabled) {
        this.sidebarConfigService.addItemToSection('admin-area', {
          id: module.id,
          label: module.name,
          icon: module.icon,
          routerLink: module.route,
          type: 'admin'
        });
      }
    });
  }

  /**
   * Obtém módulos disponíveis (simulado - viria de uma API)
   */
  private getAvailableModules() {
    return [
      { id: 'crm', name: 'CRM', icon: 'fas fa-handshake', route: '/admin/crm', enabled: true },
      { id: 'inventory', name: 'Estoque', icon: 'fas fa-boxes', route: '/admin/inventory', enabled: false },
      { id: 'marketing', name: 'Marketing', icon: 'fas fa-bullhorn', route: '/admin/marketing', enabled: true }
    ];
  }

  /**
   * Configura permissões baseadas no perfil do usuário
   */
  private checkUserPermissions(): void {
    const userRole = this.getUserRole();

    let permissions: SidebarPermissions;

    switch (userRole) {
      case 'admin':
        permissions = {
          canViewPublicArea: true,
          canViewAdminArea: true,
          canManageUsers: true,
          canManageContent: true,
          canViewReports: true
        };
        this.canConfigureSidebar = true;
        break;

      case 'manager':
        permissions = {
          canViewPublicArea: true,
          canViewAdminArea: true,
          canManageUsers: false,
          canManageContent: true,
          canViewReports: true
        };
        break;

      case 'employee':
        permissions = {
          canViewPublicArea: true,
          canViewAdminArea: false,
          canManageUsers: false,
          canManageContent: false,
          canViewReports: false
        };
        break;

      default:
        permissions = {
          canViewPublicArea: true,
          canViewAdminArea: false,
          canManageUsers: false,
          canManageContent: false,
          canViewReports: false
        };
    }

    this.sidebarConfigService.updatePermissions(permissions);
  }

  /**
   * Obtém o papel do usuário
   */
  private getUserRole(): string {
    // Implementar lógica real para obter o papel do usuário
    // return this.authService.getUserRole();
    return 'admin'; // Simulado
  }

  /**
   * Verifica se o usuário tem acesso a videoaulas
   */
  private hasVideoLessonsAccess(): boolean {
    // Implementar lógica real
    return true; // Simulado
  }

  /**
   * Abre a configuração do sidebar
   */
  openSidebarConfig(): void {
    this.router.navigate(['/admin/sidebar-config']);
  }

  /**
   * Toggle do breadcrumb
   */
  toggleBreadcrumb(): void {
    this.showBreadcrumb = !this.showBreadcrumb;
    localStorage.setItem('show-breadcrumb', this.showBreadcrumb.toString());
  }

  /**
   * Sistema de notificações
   */
  addNotification(type: Notification['type'], message: string): void {
    const notification: Notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date()
    };

    this.notifications.push(notification);

    // Remove automaticamente após 5 segundos
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, 5000);
  }

  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  trackNotification(index: number, notification: Notification): string {
    return notification.id;
  }

  getNotificationIcon(type: Notification['type']): string {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type];
  }

  /**
   * Métodos para atualizar badges do sidebar
   */
  updateSidebarBadges(): void {
    // Exemplo de como atualizar badges dinamicamente
    if (this.sidebar) {
      this.sidebar.updateBadge('news', 5);
      this.sidebar.updateBadge('events', 2);
      this.sidebar.updateBadge('birthdays', 3);
      this.sidebar.updateOnlineUsers(15);
    }
  }

  /**
   * Método para adicionar seções dinamicamente
   */
  addCustomSection(): void {
    // Exemplo de como adicionar uma seção personalizada
    this.sidebarConfigService.addSection({
      id: 'custom-section',
      title: 'Seção Personalizada',
      type: 'admin',
      items: [
        {
          id: 'custom-item',
          label: 'Item Personalizado',
          icon: 'fas fa-star',
          routerLink: '/admin/custom',
          type: 'admin'
        }
      ]
    });

    this.addNotification('success', 'Seção personalizada adicionada com sucesso!');
  }
}
