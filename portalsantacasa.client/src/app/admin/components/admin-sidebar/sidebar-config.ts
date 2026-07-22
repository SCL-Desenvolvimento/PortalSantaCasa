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
  roles?: string[];
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
        routerLink: '/',
        type: 'public',
        roles: ['admin', 'editor', 'viewer']
      },
      {
	        id: 'chat',
	        label: 'Chat',
	        icon: 'fas fa-comments',
	        routerLink: '/admin/chat',
	        badge: 'chat',
          type: 'public',
          roles: ['admin', 'editor', 'viewer']
      },
      {
        id: 'my-courses',
        label: 'Meus Cursos',
        icon: 'fas fa-graduation-cap',
        routerLink: '/admin/courses-view',
        type: 'public',
        roles: ['admin', 'editor', 'viewer']
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
        type: 'admin',
        roles: ['admin', 'editor', 'viewer']
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
            type: 'admin',
            roles: ['admin', 'editor']
          },
          {
            id: 'comunicados',
            label: 'Comunicados',
            icon: 'fas fa-bullhorn',
            routerLink: '/admin/internal',
            type: 'admin',
            roles: ['admin', 'editor']
          },
          {
            id: 'qualityMinute',
            label: 'Minuto de Qualidade',
            icon: 'fas fa-stopwatch',
            routerLink: '/admin/news',
            queryParams: { quality: true },
            type: 'admin',
            roles: ['admin', 'editor']
          },
          {
            id: 'events',
            label: 'Eventos',
            icon: 'fas fa-calendar-alt',
            routerLink: '/admin/events',
            badge: 'eventsBadge',
            type: 'admin',
            roles: ['admin', 'editor']
          },
          {
            id: 'birthdays',
            label: 'Aniversários',
            icon: 'fas fa-birthday-cake',
            routerLink: '/admin/birthdays',
            badge: 'birthdaysBadge',
            type: 'admin',
            roles: ['admin', 'editor']
          },
          {
            id: 'banners',
            label: 'Banners',
            icon: 'fas fa-images',
            routerLink: '/admin/banners',
            type: 'admin',
            roles: ['admin', 'editor']
          },
          {
            id: 'forms',
            label: 'Formulários',
            icon: 'fas fa-file-alt',
            routerLink: '/admin/forms-register',
            type: 'admin',
            roles: ['admin', 'editor']
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
            type: 'admin',
            roles: ['admin', 'editor']
          },
          {
            id: 'feedbacks',
            label: 'Sugestões',
            icon: 'fas fa-comments',
            routerLink: '/admin/feedbacks',
            type: 'admin',
            roles: ['admin', 'editor']
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
            id: 'courses',
            label: 'Cursos e Materiais',
            icon: 'fas fa-graduation-cap',
            routerLink: '/admin/courses-register',
            type: 'admin',
            roles: ['admin', 'editor']
          },
          {
            id: 'documents',
            label: 'Documentos',
            icon: 'fas fa-file-alt',
            routerLink: '/admin/documents',
            type: 'admin',
            roles: ['admin', 'editor']
          },
          {
            id: 'users',
            label: 'Usuários',
            icon: 'fas fa-users',
            routerLink: '/admin/users',
            type: 'admin',
            roles: ['admin']
          }
        ]
      },
      {
        id: 'ti-reports',
        label: 'Gestão de TI',
        icon: 'fas fa-server',
        routerLink: '/admin/ti/relatorios',
        type: 'admin',
        roles: ['admin', 'editor']
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: 'fas fa-chart-line',
        type: 'admin',
        roles: ['admin', 'editor'],
        children: [
          {
            id: 'access-logs',
            label: 'Relatório de Acessos',
            icon: 'fas fa-file-alt',
            routerLink: '/admin/access-logs',
            type: 'admin',
            roles: ['admin', 'editor']
          },
          {
            id: 'points-ranking',
            label: 'Ranking de Pontos',
            icon: 'fas fa-trophy',
            routerLink: '/admin/points-ranking',
            type: 'admin',
            roles: ['admin', 'editor']
          },
          {
            id: 'point-rules',
            label: 'Regras de Pontuação',
            icon: 'fas fa-sliders-h',
            routerLink: '/admin/point-rules',
            type: 'admin',
            roles: ['admin', 'editor']
          }
        ]
      }
    ]
  }
];

