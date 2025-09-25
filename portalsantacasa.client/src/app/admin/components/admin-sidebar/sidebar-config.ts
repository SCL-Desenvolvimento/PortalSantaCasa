export interface SidebarItem {
  id: string;
  label: string;
  icon?: string;
  routerLink?: string;
  queryParams?: { [key: string]: any };
  badge?: string;
  badgeValue?: number;
  children?: SidebarItem[];
  type: 'public' | 'admin';
}

export interface SidebarSection {
  id: string;
  title: string;
  type: 'public' | 'admin';
  items: SidebarItem[];
}

export const SIDEBAR_CONFIG: SidebarSection[] = [
  {
    id: 'public-area',
    title: 'Área Pública',
    type: 'public',
    items: [
      {
        id: 'home',
        label: 'Início',
        icon: 'fas fa-home',
        routerLink: '/public/home',
        type: 'public'
      },
      {
        id: 'chat',
        label: 'Chat',
        icon: 'fas fa-comments',
        routerLink: '/public/chat',
        type: 'public'
      },
      {
        id: 'video-lessons',
        label: 'Video Aulas',
        icon: 'fas fa-video',
        routerLink: '/public/video-lessons',
        type: 'public'
      }
    ]
  },
  {
    id: 'admin-area',
    title: 'Área Administrativa',
    type: 'admin',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'fas fa-tachometer-alt',
        routerLink: '/admin/dashboard',
        type: 'admin'
      },
      {
        id: 'communication',
        label: 'Comunicação',
        icon: 'fas fa-bullhorn',
        type: 'admin',
        children: [
          {
            id: 'news',
            label: 'Notícias',
            icon: 'fas fa-newspaper',
            routerLink: '/admin/news',
            queryParams: { quality: false },
            badge: 'newsBadge',
            type: 'admin'
          },
          {
            id: 'qualityMinute',
            label: 'Minuto de Qualidade',
            icon: 'fas fa-stopwatch',
            routerLink: '/admin/news',
            queryParams: { quality: true },
            type: 'admin'
          },
          {
            id: 'events',
            label: 'Eventos',
            icon: 'fas fa-calendar-alt',
            routerLink: '/admin/events',
            badge: 'eventsBadge',
            type: 'admin'
          },
          {
            id: 'birthdays',
            label: 'Aniversários',
            icon: 'fas fa-birthday-cake',
            routerLink: '/admin/birthdays',
            badge: 'birthdaysBadge',
            type: 'admin'
          },
          {
            id: 'banners',
            label: 'Banners',
            icon: 'fas fa-images',
            routerLink: '/admin/banners',
            type: 'admin'
          }
        ]
      },
      {
        id: 'services',
        label: 'Serviços',
        icon: 'fas fa-concierge-bell',
        type: 'admin',
        children: [
          {
            id: 'menu',
            label: 'Cardápio',
            icon: 'fas fa-utensils',
            routerLink: '/admin/menu',
            type: 'admin'
          },
          {
            id: 'feedbacks',
            label: 'Feedbacks',
            icon: 'fas fa-comments',
            routerLink: '/admin/feedbacks',
            type: 'admin'
          }
        ]
      },
      {
        id: 'resources',
        label: 'Recursos',
        icon: 'fas fa-cogs',
        type: 'admin',
        children: [
          {
            id: 'documents',
            label: 'Documentos',
            icon: 'fas fa-file-alt',
            routerLink: '/admin/documents',
            type: 'admin'
          },
          {
            id: 'users',
            label: 'Usuários',
            icon: 'fas fa-users',
            routerLink: '/admin/users',
            type: 'admin'
          }
        ]
      }
    ]
  }
];

