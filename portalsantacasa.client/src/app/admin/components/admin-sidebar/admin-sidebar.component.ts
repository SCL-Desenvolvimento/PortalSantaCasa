import { Component, EventEmitter, HostListener, Output, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, takeUntil, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { SidebarConfigService, SidebarPermissions } from './sidebar-config.service';
import { ChatService } from '../../../core/services/chat.service';
import { SidebarSection, SidebarItem } from './sidebar-config';

@Component({
  selector: 'app-admin-sidebar',
  standalone: false,
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminSidebarComponent implements OnInit, OnDestroy {
  @Output() navigationChange = new EventEmitter<string>();
  @Output() sidebarToggle = new EventEmitter<boolean>();

  private destroy$ = new Subject<void>();

  isCollapsed = false;
  showMobileOverlay = false;
  activeItem = 'dashboard';
  expandedDropdowns: string[] = [];

  sidebarConfig: SidebarSection[] = [];
  permissions: SidebarPermissions = {
    canViewPublicArea: true,
    canViewAdminArea: true,
    canManageUsers: true,
    canManageContent: true,
    canViewReports: true
  };

  badges: { [key: string]: number } = {
    news: 0,
    events: 0,
    birthdays: 0,
    chat: 0
  };

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
    this.subscribeToChatUnreadCount();
    this.updateTime();
    this.checkScreenSize();
    this.setActiveFromRoute();
    this.expandActiveDropdown();

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

  private initializeComponent(): void {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed');
    if (savedCollapsed) {
      this.isCollapsed = savedCollapsed === 'true';
    }
  }

  private subscribeToConfigChanges(): void {
    this.sidebarConfigService.config$
      .pipe(takeUntil(this.destroy$))
      .subscribe(config => {
        this.sidebarConfig = config;
        this.updateDropdownMapping();
      });
  }

  private subscribeToPermissionChanges(): void {
    this.sidebarConfigService.permissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(permissions => {
        this.permissions = permissions;
      });
  }

  private subscribeToRouterEvents(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.setActiveFromRoute();
      this.expandActiveDropdown();
    });
  }

  private subscribeToChatUnreadCount(): void {
    this.chatService.totalUnreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.badges['chat'] = count;
        this.cdr.detectChanges();
      });
  }

  private updateDropdownMapping(): void {
    this.sidebarConfig.forEach(section => {
      section.items.forEach(item => {
        if (item.children && item.children.length > 0) {
          const childIds = item.children.map(child => child.id);
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

    for (const section of this.sidebarConfig) {
      for (const item of section.items) {
        if (this.isItemActive(item, currentRoute)) {
          this.activeItem = item.id;
          return;
        }

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

    if (currentRoute.startsWith(item.routerLink)) {
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

      localStorage.setItem('sidebar-collapsed', this.isCollapsed.toString());

      if (this.isCollapsed) {
        this.expandedDropdowns = [];
      } else {
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

    if (window.innerWidth <= 768) {
      this.closeMobileSidebar();
    }
  }

  toggleDropdown(dropdownId: string): void {
    if (this.isCollapsed) return;

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

  canViewSection(section: SidebarSection): boolean {
    if (section.type === 'public' && !this.permissions.canViewPublicArea) {
      return false;
    }
    if (section.type === 'admin' && !this.permissions.canViewAdminArea) {
      return false;
    }
    return true;
  }

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

  getBadgeValue(item: SidebarItem): number | undefined {
    if (!item.badge) return undefined;
    return this.badges[item.badge] || 0;
  }

  navigateToItem(item: SidebarItem): void {
    if (!item.routerLink) return;

    if (item.queryParams) {
      this.router.navigate([item.routerLink], { queryParams: item.queryParams });
    } else {
      this.router.navigate([item.routerLink]);
    }

    this.setActive(item.id);
  }

  updateBadge(badgeKey: string, count: number): void {
    this.badges[badgeKey] = count;
  }

  updateOnlineUsers(count: number): void {
    this.onlineUsers = count;
  }

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
