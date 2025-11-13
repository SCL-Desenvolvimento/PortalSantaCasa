import { Component, EventEmitter, HostListener, Output, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, takeUntil, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { SidebarConfigService, SidebarPermissions } from './sidebar-config.service';
import { ChatService } from '../../../core/services/chat.service'; // Importar ChatService
import { SidebarSection, SidebarItem } from './sidebar-config';

@Component({
  selector: 'app-admin-sidebar',
  standalone: false,
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.css'
})
export class AdminSidebarComponent implements OnInit, OnDestroy {
  @Output() navigationChange = new EventEmitter<string>();
  @Output() sidebarToggle = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();

  isCollapsed = false;
  showMobileOverlay = false;
  activeItem = 'dashboard';
  expandedDropdowns: string[] = [];

  // Configuração dinâmica do sidebar
  sidebarConfig: SidebarSection[] = [];
  permissions: SidebarPermissions = {
    canViewPublicArea: true,
    canViewAdminArea: true,
    canManageUsers: true,
    canManageContent: true,
    canViewReports: true
  };

  // Badges de notificação
  badges: { [key: string]: number } = {
    news: 0,
    events: 0,
    birthdays: 0,
    chat: 0 // Adicionar badge para chat
  };

  // Stats do footer
  onlineUsers = 12;
  currentTime = new Date();

  constructor(
    private router: Router,
    private sidebarConfigService: SidebarConfigService,
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.initializeComponent();
    this.subscribeToConfigChanges();
    this.subscribeToPermissionChanges();
    this.subscribeToRouterEvents();
    this.subscribeToChatUnreadCount(); // Nova subscrição
    this.updateTime();
    this.checkScreenSize();
    this.setActiveFromRoute();
    this.expandActiveDropdown();

    // Atualiza o tempo a cada minuto
    setInterval(() => {
      this.updateTime();
    }, 60000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  /**
   * Inicializa o componente com configurações padrão
   */
  private initializeComponent(): void {
    // Carrega estado colapsado do localStorage
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed) {
      this.isCollapsed = savedCollapsed === 'true';
    }
  }

  /**
   * Subscreve às mudanças de configuração do sidebar
   */
  private subscribeToConfigChanges(): void {
    this.sidebarConfigService.config$
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        this.sidebarConfig = config;
        this.updateDropdownMapping();
      });
  }

  /**
   * Subscreve às mudanças de permissões
   */
  private subscribeToPermissionChanges(): void {
    this.sidebarConfigService.permissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(permissions => {
        this.permissions = permissions;
      });
  }

  /**
   * Subscreve aos eventos do router
   */
  private subscribeToRouterEvents(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      this.setActiveFromRoute();
      this.expandActiveDropdown();
    });
  }

  /**
   * Subscreve à contagem de chats não lidos
   */
  private subscribeToChatUnreadCount(): void {
    this.chatService.totalUnreadCount$
      .pipe(
        takeUntil(this.destroy$),
        // 🔥 ADICIONAR LOGS DETALHADOS
        tap(count => console.log('🔄 Sidebar - Contador recebido:', count))
      )
      .subscribe(count => {
        console.log('🎯 Sidebar - Atualizando badge para:', count);
        this.badges['chat'] = count;

        // Forçar a detecção de mudanças
        this.cdr.detectChanges();

        // Log adicional para debug
        console.log('✅ Sidebar - Badge atualizado:', this.badges['chat']);
      });

    // Busca inicial da contagem
    this.chatService.getTotalUnreadChatsCount().subscribe({
      next: (count) => {
        console.log('📊 Sidebar - Contagem inicial:', count);
        this.badges['chat'] = count;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Sidebar - Erro ao buscar contagem inicial:', err);
      }
    });
  }

  /**
   * Atualiza o mapeamento de dropdowns baseado na configuração atual
   */
  private updateDropdownMapping(): void {
    // Atualiza dinamicamente baseado na configuração atual
    this.sidebarConfig.forEach(section => {
      section.items.forEach(item => {
        if (item.children && item.children.length > 0) {
          // Mapeia os filhos para o dropdown
          const childIds = item.children.map(child => child.id);
          // Você pode usar uma propriedade para armazenar este mapeamento
        }
      });
    });
  }

  private checkScreenSize(): void {
    const isMobile = window.innerWidth <= 768;
    if (isMobile && !this.isCollapsed) {
      this.showMobileOverlay = false;
    }
  }

  private setActiveFromRoute(): void {
    const currentRoute = this.router.url;

    // Busca o item ativo na configuração dinâmica
    for (const section of this.sidebarConfig) {
      for (const item of section.items) {
        if (this.isItemActive(item, currentRoute)) {
          this.activeItem = item.id;
          return;
        }

        // Verifica filhos se existirem
        if (item.children) {
          for (const child of item.children) {
            if (this.isItemActive(child, currentRoute)) {
              this.activeItem = child.id;
              return;
            }
          }
        }
      }
    }
  }

  private isItemActive(item: SidebarItem, currentRoute: string): boolean {
    if (!item.routerLink) return false;

    // Verifica se a rota atual corresponde ao routerLink do item
    if (currentRoute.startsWith(item.routerLink)) {
      // Se há queryParams, verifica se eles correspondem
      if (item.queryParams) {
        const urlParams = new URLSearchParams(currentRoute.split('?')[1] || '');
        for (const [key, value] of Object.entries(item.queryParams)) {
          if (urlParams.get(key) !== String(value)) {
            return false;
          }
        }
      }
      return true;
    }

    return false;
  }

  private expandActiveDropdown(): void {
    // Encontra qual dropdown contém o item ativo
    for (const section of this.sidebarConfig) {
      for (const item of section.items) {
        if (item.children) {
          const hasActiveChild = item.children.some(child => child.id === this.activeItem);
          if (hasActiveChild && !this.expandedDropdowns.includes(item.id)) {
            this.expandedDropdowns.push(item.id);
            break;
          }
        }
      }
    }
  }

  toggleSidebar(): void {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      this.showMobileOverlay = !this.showMobileOverlay;
    } else {
      this.isCollapsed = !this.isCollapsed;
      this.sidebarToggle.emit(this.isCollapsed);

      // Salva preferência no localStorage
      localStorage.setItem('sidebar-collapsed', this.isCollapsed.toString());

      // Fecha todos os dropdowns quando colapsa
      if (this.isCollapsed) {
        this.expandedDropdowns = [];
      } else {
        // Reexpande o dropdown ativo quando expande
        this.expandActiveDropdown();
      }
    }
  }

  closeMobileSidebar(): void {
    this.showMobileOverlay = false;
  }

  setActive(item: string): void {
    this.activeItem = item;
    this.navigationChange.emit(item);

    // Fecha sidebar em mobile após seleção
    if (window.innerWidth <= 768) {
      this.closeMobileSidebar();
    }
  }

  toggleDropdown(dropdownId: string): void {
    if (this.isCollapsed) {
      return; // Não permite toggle quando colapsado
    }

    const index = this.expandedDropdowns.indexOf(dropdownId);
    if (index > -1) {
      this.expandedDropdowns.splice(index, 1);
    } else {
      this.expandedDropdowns.push(dropdownId);
    }
  }

  isDropdownActive(item: SidebarItem): boolean {
    if (!item.children) return false;
    return item.children.some(child => child.id === this.activeItem);
  }

  private updateTime(): void {
    this.currentTime = new Date();
  }

  /**
   * Verifica se o usuário tem permissão para ver uma seção
   */
  canViewSection(section: SidebarSection): boolean {
    if (section.type === 'public' && !this.permissions.canViewPublicArea) {
      return false;
    }
    if (section.type === 'admin' && !this.permissions.canViewAdminArea) {
      return false;
    }
    return true;
  }

  /**
   * Verifica se o usuário tem permissão para ver um item
   */
  canViewItem(item: SidebarItem): boolean {
    switch (item.id) {
      case 'users':
        return this.permissions.canManageUsers;
      case 'news':
      case 'events':
      case 'banners':
        return this.permissions.canManageContent;
      case 'dashboard':
        return this.permissions.canViewReports;
      default:
        return true;
    }
  }

  /**
   * Obtém o valor do badge para um item
   */
  getBadgeValue(item: SidebarItem): number | undefined {
    if (!item.badge) return undefined;
    return this.badges[item.badge] || 0;
  }

  /**
   * Navega para um item do sidebar
   */
  navigateToItem(item: SidebarItem): void {
    if (!item.routerLink) return;

    if (item.queryParams) {
      this.router.navigate([item.routerLink], { queryParams: item.queryParams });
    } else {
      this.router.navigate([item.routerLink]);
    }

    this.setActive(item.id);
  }

  /**
   * Métodos públicos para atualizar badges (chamados por serviços externos)
   */
  updateBadge(badgeKey: string, count: number): void {
    this.badges[badgeKey] = count;
  }

  updateOnlineUsers(count: number): void {
    this.onlineUsers = count;
  }

  /**
   * Métodos de conveniência para gerenciar configuração
   */
  addSection(section: SidebarSection): void {
    this.sidebarConfigService.addSection(section);
  }

  removeSection(sectionId: string): void {
    this.sidebarConfigService.removeSection(sectionId);
  }

  addItemToSection(sectionId: string, item: SidebarItem): void {
    this.sidebarConfigService.addItemToSection(sectionId, item);
  }

  removeItemFromSection(sectionId: string, itemId: string): void {
    this.sidebarConfigService.removeItemFromSection(sectionId, itemId);
  }

  resetToDefault(): void {
    this.sidebarConfigService.resetToDefault();
  }
}
