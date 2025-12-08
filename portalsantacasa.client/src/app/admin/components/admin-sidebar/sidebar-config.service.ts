import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SidebarSection, SidebarItem, SIDEBAR_CONFIG } from './sidebar-config';

export interface SidebarPermissions {
  canViewPublicArea: boolean;
  canViewAdminArea: boolean;
  canManageUsers: boolean;
  canManageContent: boolean;
  canViewReports: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SidebarConfigService {
  private configSubject = new BehaviorSubject<SidebarSection[]>(SIDEBAR_CONFIG);
  private permissionsSubject = new BehaviorSubject<SidebarPermissions>({
    canViewPublicArea: true,
    canViewAdminArea: true,
    canManageUsers: true,
    canManageContent: true,
    canViewReports: true
  });

  public config$ = this.configSubject.asObservable();
  public permissions$ = this.permissionsSubject.asObservable();

  constructor() {
    this.loadConfigFromStorage();
  }

  /**
   * Obtém a configuração atual do sidebar
   */
  getCurrentConfig(): SidebarSection[] {
    return this.configSubject.value;
  }

  /**
   * Atualiza a configuração completa do sidebar
   */
  updateConfig(config: SidebarSection[]): void {
    this.configSubject.next(config);
    this.saveConfigToStorage(config);
  }

  /**
   * Adiciona uma nova seção ao sidebar
   */
  addSection(section: SidebarSection, position?: number): void {
    const currentConfig = [...this.getCurrentConfig()];
    
    if (position !== undefined && position >= 0 && position <= currentConfig.length) {
      currentConfig.splice(position, 0, section);
    } else {
      currentConfig.push(section);
    }
    
    this.updateConfig(currentConfig);
  }

  /**
   * Remove uma seção do sidebar
   */
  removeSection(sectionId: string): void {
    const currentConfig = this.getCurrentConfig().filter(section => section.id !== sectionId);
    this.updateConfig(currentConfig);
  }

  /**
   * Adiciona um item a uma seção específica
   */
  addItemToSection(sectionId: string, item: SidebarItem, position?: number): void {
    const currentConfig = [...this.getCurrentConfig()];
    const sectionIndex = currentConfig.findIndex(section => section.id === sectionId);
    
    if (sectionIndex !== -1) {
      const section = { ...currentConfig[sectionIndex] };
      const items = [...section.items];
      
      if (position !== undefined && position >= 0 && position <= items.length) {
        items.splice(position, 0, item);
      } else {
        items.push(item);
      }
      
      section.items = items;
      currentConfig[sectionIndex] = section;
      this.updateConfig(currentConfig);
    }
  }

  /**
   * Remove um item de uma seção específica
   */
  removeItemFromSection(sectionId: string, itemId: string): void {
    const currentConfig = [...this.getCurrentConfig()];
    const sectionIndex = currentConfig.findIndex(section => section.id === sectionId);
    
    if (sectionIndex !== -1) {
      const section = { ...currentConfig[sectionIndex] };
      section.items = section.items.filter(item => item.id !== itemId);
      currentConfig[sectionIndex] = section;
      this.updateConfig(currentConfig);
    }
  }

  /**
   * Adiciona um subitem a um item específico (para dropdowns)
   */
  addSubItem(sectionId: string, parentItemId: string, subItem: SidebarItem, position?: number): void {
    const currentConfig = [...this.getCurrentConfig()];
    const sectionIndex = currentConfig.findIndex(section => section.id === sectionId);
    
    if (sectionIndex !== -1) {
      const section = { ...currentConfig[sectionIndex] };
      const itemIndex = section.items.findIndex(item => item.id === parentItemId);
      
      if (itemIndex !== -1) {
        const item = { ...section.items[itemIndex] };
        const children = item.children ? [...item.children] : [];
        
        if (position !== undefined && position >= 0 && position <= children.length) {
          children.splice(position, 0, subItem);
        } else {
          children.push(subItem);
        }
        
        item.children = children;
        section.items[itemIndex] = item;
        currentConfig[sectionIndex] = section;
        this.updateConfig(currentConfig);
      }
    }
  }

  /**
   * Remove um subitem de um item específico
   */
  removeSubItem(sectionId: string, parentItemId: string, subItemId: string): void {
    const currentConfig = [...this.getCurrentConfig()];
    const sectionIndex = currentConfig.findIndex(section => section.id === sectionId);
    
    if (sectionIndex !== -1) {
      const section = { ...currentConfig[sectionIndex] };
      const itemIndex = section.items.findIndex(item => item.id === parentItemId);
      
      if (itemIndex !== -1) {
        const item = { ...section.items[itemIndex] };
        if (item.children) {
          item.children = item.children.filter(child => child.id !== subItemId);
          section.items[itemIndex] = item;
          currentConfig[sectionIndex] = section;
          this.updateConfig(currentConfig);
        }
      }
    }
  }

  /**
   * Atualiza as permissões do usuário
   */
  updatePermissions(permissions: SidebarPermissions): void {
    this.permissionsSubject.next(permissions);
    localStorage.setItem('sidebar-permissions', JSON.stringify(permissions));
  }

  /**
   * Obtém as permissões atuais
   */
  getCurrentPermissions(): SidebarPermissions {
    return this.permissionsSubject.value;
  }

  /**
   * Filtra a configuração baseada nas permissões do usuário
   */
  getFilteredConfig(): Observable<SidebarSection[]> {
    return new Observable(observer => {
      const config = this.getCurrentConfig();
      const permissions = this.getCurrentPermissions();
      
      const filteredConfig = config.filter(section => {
        if (section.type === 'public' && !permissions.canViewPublicArea) {
          return false;
        }
        if (section.type === 'admin' && !permissions.canViewAdminArea) {
          return false;
        }
        return true;
      }).map(section => ({
        ...section,
        items: section.items.filter(item => this.hasPermissionForItem(item, permissions))
      }));
      
      observer.next(filteredConfig);
      observer.complete();
    });
  }

  /**
   * Verifica se o usuário tem permissão para ver um item específico
   */
  private hasPermissionForItem(item: SidebarItem, permissions: SidebarPermissions): boolean {
    // Lógica de permissões baseada no ID do item
    switch (item.id) {
      case 'users':
        return permissions.canManageUsers;
      case 'news':
      case 'events':
      case 'banners':
        return permissions.canManageContent;
      case 'dashboard':
        return permissions.canViewReports;
      default:
        return true;
    }
  }

  /**
   * Salva a configuração no localStorage
   */
  private saveConfigToStorage(config: SidebarSection[]): void {
    localStorage.setItem('sidebar-config', JSON.stringify(config));
  }

  /**
   * Carrega a configuração do localStorage
   */
  private loadConfigFromStorage(): void {
    const savedConfig = localStorage.getItem('sidebar-config');
    const savedPermissions = localStorage.getItem('sidebar-permissions');
    
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        this.configSubject.next(config);
      } catch (error) {
        console.warn('Erro ao carregar configuração do sidebar:', error);
      }
    }
    
    if (savedPermissions) {
      try {
        const permissions = JSON.parse(savedPermissions);
        this.permissionsSubject.next(permissions);
      } catch (error) {
        console.warn('Erro ao carregar permissões do sidebar:', error);
      }
    }
  }

  /**
   * Restaura a configuração padrão
   */
  resetToDefault(): void {
    this.updateConfig(SIDEBAR_CONFIG);
    localStorage.removeItem('sidebar-config');
  }

  /**
   * Métodos de conveniência para adicionar funcionalidades comuns
   */

  /**
   * Adiciona uma nova área de chat
   */
  addChatArea(): void {
    const chatSection: SidebarSection = {
      id: 'chat-area',
      title: 'Chat',
      type: 'public',
      items: [
        {
          id: 'general-chat',
          label: 'Chat Geral',
          icon: 'fas fa-comments',
          routerLink: '/chat/general',
          type: 'public'
        },
        {
          id: 'private-messages',
          label: 'Mensagens Privadas',
          icon: 'fas fa-envelope',
          routerLink: '/chat/private',
          type: 'public'
        }
      ]
    };
    
    this.addSection(chatSection);
  }

  /**
   * Adiciona uma área de videoaulas
   */
  addVideoLessonsArea(): void {
    const videoSection: SidebarSection = {
      id: 'video-lessons-area',
      title: 'Video Aulas',
      type: 'public',
      items: [
        {
          id: 'my-courses',
          label: 'Meus Cursos',
          icon: 'fas fa-graduation-cap',
          routerLink: '/video-lessons/my-courses',
          type: 'public'
        },
        {
          id: 'browse-courses',
          label: 'Explorar Cursos',
          icon: 'fas fa-search',
          routerLink: '/video-lessons/browse',
          type: 'public'
        },
        {
          id: 'favorites',
          label: 'Favoritos',
          icon: 'fas fa-heart',
          routerLink: '/video-lessons/favorites',
          type: 'public'
        }
      ]
    };
    
    this.addSection(videoSection);
  }

  /**
   * Adiciona funcionalidades de relatórios
   */
  addReportsArea(): void {
    const reportsItem: SidebarItem = {
      id: 'reports',
      label: 'Relatórios',
      icon: 'fas fa-chart-bar',
      type: 'admin',
      children: [
        {
          id: 'user-reports',
          label: 'Relatório de Usuários',
          icon: 'fas fa-users',
          routerLink: '/admin/reports/users',
          type: 'admin'
        },
        {
          id: 'activity-reports',
          label: 'Relatório de Atividades',
          icon: 'fas fa-activity',
          routerLink: '/admin/reports/activity',
          type: 'admin'
        }
      ]
    };
    
    this.addItemToSection('admin-area', reportsItem);
  }
}
