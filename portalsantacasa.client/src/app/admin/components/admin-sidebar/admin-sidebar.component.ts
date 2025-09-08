import { Component, EventEmitter, HostListener, Output } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-admin-sidebar',
  standalone: false,
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.css'
})
export class AdminSidebarComponent {
  @Output() navigationChange = new EventEmitter<string>();
  @Output() sidebarToggle = new EventEmitter<boolean>();

  isCollapsed = false;
  showMobileOverlay = false;
  activeItem = 'dashboard';

  // Badges de notificação
  newsBadge = 2;
  eventsBadge = 1;
  birthdaysBadge = 3;

  // Stats do footer
  onlineUsers = 12;
  currentTime = new Date();

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.updateTime();
    this.checkScreenSize();
    this.setActiveFromRoute();

    // Atualiza o tempo a cada minuto
    setInterval(() => {
      this.updateTime();
    }, 60000);

    // Escuta mudanças de rota para atualizar item ativo
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.setActiveFromRoute();
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    const isMobile = window.innerWidth <= 768;
    if (isMobile && !this.isCollapsed) {
      // Em mobile, sidebar começa fechada
      this.showMobileOverlay = false;
    }
  }

  private setActiveFromRoute(): void {
    const currentRoute = this.router.url;

    if (currentRoute.includes('/admin/dashboard')) {
      this.activeItem = 'dashboard';
    } else if (currentRoute.includes('/admin/news')) {
      this.activeItem = 'news';
    } else if (currentRoute.includes('/admin/events')) {
      this.activeItem = 'events';
    } else if (currentRoute.includes('/admin/birthdays')) {
      this.activeItem = 'birthdays';
    } else if (currentRoute.includes('/admin/banners')) {
      this.activeItem = 'banners';
    } else if (currentRoute.includes('/admin/menu')) {
      this.activeItem = 'menu';
    } else if (currentRoute.includes('/admin/feedbacks')) {
      this.activeItem = 'feedbacks';
    } else if (currentRoute.includes('/admin/documents')) {
      this.activeItem = 'documents';
    } else if (currentRoute.includes('/admin/users')) {
      this.activeItem = 'users';
    }
  }

  toggleSidebar(): void {
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
      this.showMobileOverlay = !this.showMobileOverlay;
    } else {
      this.isCollapsed = !this.isCollapsed;
      this.sidebarToggle.emit(this.isCollapsed);
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

  private updateTime(): void {
    this.currentTime = new Date();
  }

  // Métodos para atualizar badges (chamados por serviços externos)
  updateNewsBadge(count: number): void {
    this.newsBadge = count;
  }

  updateEventsBadge(count: number): void {
    this.eventsBadge = count;
  }

  updateBirthdaysBadge(count: number): void {
    this.birthdaysBadge = count;
  }

  updateOnlineUsers(count: number): void {
    this.onlineUsers = count;
  }

}
