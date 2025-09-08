import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { Router } from '@angular/router';

interface SearchResult {
  id: string;
  title: string;
  category: string;
  icon: string;
  url?: string;
}

interface Notification {
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
export class AdminHeaderComponent {
  @Output() onLogout = new EventEmitter<void>();

  // Estados
  searchQuery = '';
  searchResults: SearchResult[] = [];
  showNotifications = false;
  showUserMenu = false;
  isDarkMode = false;

  // Dados do usuário
  userName = 'Administrador';
  userRole = 'Admin';
  userAvatar = '';

  // Notificações
  notificationCount = 3;
  notifications: Notification[] = [
    {
      id: '1',
      title: 'Nova notícia publicada',
      message: 'Confira as últimas atualizações da empresa',
      time: new Date(Date.now() - 30 * 60 * 1000), // 30 min atrás
      read: false,
      icon: 'fas fa-newspaper',
      color: '#1a8dc3'
    },
    {
      id: '2',
      title: 'Aniversário hoje',
      message: 'Maria Santos está fazendo aniversário hoje!',
      time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h atrás
      read: false,
      icon: 'fas fa-birthday-cake',
      color: '#f59e0b'
    },
    {
      id: '3',
      title: 'Cardápio atualizado',
      message: 'Novo cardápio da semana disponível',
      time: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4h atrás
      read: true,
      icon: 'fas fa-utensils',
      color: '#10b981'
    }
  ];

  // Dados de busca mockados
  private searchData: SearchResult[] = [
    { id: '1', title: 'Dashboard', category: 'Páginas', icon: 'fas fa-tachometer-alt', url: '/admin/dashboard' },
    { id: '2', title: 'Notícias', category: 'Páginas', icon: 'fas fa-newspaper', url: '/admin/news' },
    { id: '3', title: 'Documentos', category: 'Páginas', icon: 'fas fa-file-alt', url: '/admin/documents' },
    { id: '4', title: 'Eventos', category: 'Páginas', icon: 'fas fa-calendar-alt', url: '/admin/events' },
    { id: '5', title: 'Usuários', category: 'Páginas', icon: 'fas fa-users', url: '/admin/users' },
    { id: '6', title: 'Aniversariantes', category: 'Páginas', icon: 'fas fa-birthday-cake', url: '/admin/birthdays' },
    { id: '7', title: 'Cardápio', category: 'Páginas', icon: 'fas fa-utensils', url: '/admin/menu' },
    { id: '8', title: 'Feedbacks', category: 'Páginas', icon: 'fas fa-comments', url: '/admin/feedbacks' },
    { id: '9', title: 'Banners', category: 'Páginas', icon: 'fas fa-images', url: '/admin/banners' }
  ];

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.updateNotificationCount();
  }

  // ===== BUSCA =====
  onSearch(event: any): void {
    const query = event.target.value.toLowerCase().trim();

    if (query.length === 0) {
      this.searchResults = [];
      return;
    }

    if (query.length < 2) {
      return;
    }

    // Simula busca com delay
    setTimeout(() => {
      this.searchResults = this.searchData.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      ).slice(0, 5);
    }, 200);
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
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    this.updateNotificationCount();
    console.log('Todas as notificações foram marcadas como lidas');
  }

  dismissNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.updateNotificationCount();
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
    this.onLogout.emit();
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
  }
}
