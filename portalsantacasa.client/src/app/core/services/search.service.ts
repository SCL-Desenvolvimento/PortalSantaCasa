import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SearchResult {
  id: string;
  title: string;
  category: string;
  icon: string;
  url?: string;
  description?: string;
  isExternal?: boolean;
  type: 'user' | 'document' | 'news' | 'event' | 'announcement' | 'form' | 'page' | 'menu';
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  search(query: string, role = 'viewer'): Observable<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return of([]);
    }

    const searchTerm = query.trim();
    const normalizedRole = role.toLowerCase();
    const canSearchUsers = normalizedRole === 'admin' || normalizedRole === 'superadmin';

    return forkJoin([
      this.searchAdminPages(searchTerm, normalizedRole),
      this.publicSearch(searchTerm),
      canSearchUsers ? this.searchUsers(searchTerm) : of([] as SearchResult[])
    ]).pipe(
      map(results => {
        const uniqueResults = new Map<string, SearchResult>();
        results.flat().forEach(result => uniqueResults.set(`${result.type}:${result.id}`, result));
        return Array.from(uniqueResults.values()).slice(0, 20);
      }),
      catchError(error => {
        console.error('Erro na busca:', error);
        return of([]);
      })
    );
  }

  publicSearch(query: string): Observable<SearchResult[]> {
    const term = query.trim();
    if (term.length < 2) return of([]);

    const normalizedTerm = this.normalize(term);
    const publicPages = ([
      { id: 'page-home', title: 'Início', category: 'Páginas', icon: 'fas fa-home', url: '/', type: 'page' },
      { id: 'page-news', title: 'Notícias', category: 'Páginas', icon: 'fas fa-newspaper', url: '/noticias?isQualityMinute=false', type: 'page' },
      { id: 'page-quality', title: 'Minuto da Qualidade', category: 'Páginas', icon: 'fas fa-star', url: '/noticias?isQualityMinute=true', type: 'page' },
      { id: 'page-announcements', title: 'Comunicados', category: 'Páginas', icon: 'fas fa-bullhorn', url: '/comunicados', type: 'page' },
      { id: 'page-events', title: 'Agenda de Eventos', category: 'Páginas', icon: 'fas fa-calendar-alt', url: '/?view=events', type: 'page' },
      { id: 'page-birthdays', title: 'Aniversariantes', category: 'Páginas', icon: 'fas fa-birthday-cake', url: '/?view=birthdays', type: 'page' },
      { id: 'page-menu', title: 'Cardápio', category: 'Páginas', icon: 'fas fa-utensils', url: '/?view=menu', type: 'page' },
      { id: 'page-documents', title: 'Documentos', category: 'Páginas', icon: 'fas fa-folder', url: '/documentos', type: 'page' },
      { id: 'page-forms', title: 'Formulários', category: 'Páginas', icon: 'fas fa-clipboard-list', url: '/formularios', type: 'page' },
      { id: 'page-games', title: 'Jogos', category: 'Páginas', icon: 'fas fa-gamepad', url: '/games', type: 'page' }
    ] satisfies SearchResult[]).filter(page => this.normalize(`${page.title} ${page.category}`).includes(normalizedTerm));

    return this.http.get<SearchResult[]>(`${this.apiUrl}/public-search?q=${encodeURIComponent(term)}`).pipe(
      map(results => [...results, ...publicPages].slice(0, 16)),
      catchError(() => of(publicPages))
    );
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private searchUsers(query: string): Observable<SearchResult[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/search?q=${encodeURIComponent(query)}`).pipe(
      map(users => users.map(user => ({
        id: `user-${user.id}`,
        title: user.username || user.name,
        category: 'Pessoas',
        icon: 'fas fa-user',
        url: `/admin/users?search=${encodeURIComponent(user.username || user.name || '')}`,
        description: user.department || user.email,
        type: 'user' as const
      }))),
      catchError(() => of([]))
    );
  }

  private searchAdminPages(query: string, role: string): Observable<SearchResult[]> {
    const managerRoles = ['admin', 'superadmin', 'editor'];
    const pages = [
      { id: 'admin-dashboard', title: 'Dashboard', icon: 'fas fa-tachometer-alt', url: '/admin/dashboard', roles: ['admin', 'superadmin', 'editor', 'viewer'] },
      { id: 'admin-chat', title: 'Chat interno', icon: 'fas fa-comments', url: '/admin/chat', roles: ['admin', 'superadmin', 'editor', 'viewer'] },
      { id: 'admin-courses-view', title: 'Meus cursos', icon: 'fas fa-graduation-cap', url: '/admin/courses-view', roles: ['admin', 'superadmin', 'editor', 'viewer'] },
      { id: 'admin-profile', title: 'Meu perfil', icon: 'fas fa-user-circle', url: '/admin/profile', roles: ['admin', 'superadmin', 'editor', 'viewer'] },
      { id: 'admin-settings', title: 'Configurações', icon: 'fas fa-cog', url: '/admin/settings', roles: ['admin', 'superadmin', 'editor', 'viewer'] },
      { id: 'admin-news', title: 'Gerenciar notícias', icon: 'fas fa-newspaper', url: '/admin/news?quality=false', roles: managerRoles },
      { id: 'admin-quality', title: 'Gerenciar Minuto da Qualidade', icon: 'fas fa-stopwatch', url: '/admin/news?quality=true', roles: managerRoles },
      { id: 'admin-announcements', title: 'Gerenciar comunicados', icon: 'fas fa-bullhorn', url: '/admin/internal', roles: managerRoles },
      { id: 'admin-documents', title: 'Gerenciar documentos', icon: 'fas fa-file-alt', url: '/admin/documents', roles: managerRoles },
      { id: 'admin-events', title: 'Gerenciar eventos', icon: 'fas fa-calendar-alt', url: '/admin/events', roles: managerRoles },
      { id: 'admin-birthdays', title: 'Gerenciar aniversariantes', icon: 'fas fa-birthday-cake', url: '/admin/birthdays', roles: managerRoles },
      { id: 'admin-menu', title: 'Gerenciar cardápio', icon: 'fas fa-utensils', url: '/admin/menu', roles: managerRoles },
      { id: 'admin-feedbacks', title: 'Gerenciar sugestões', icon: 'fas fa-comments', url: '/admin/feedbacks', roles: managerRoles },
      { id: 'admin-banners', title: 'Gerenciar banners', icon: 'fas fa-images', url: '/admin/banners', roles: managerRoles },
      { id: 'admin-forms', title: 'Gerenciar formulários', icon: 'fas fa-clipboard-list', url: '/admin/forms-register', roles: managerRoles },
      { id: 'admin-courses', title: 'Gerenciar videoaulas', icon: 'fas fa-video', url: '/admin/courses-register', roles: managerRoles },
      { id: 'admin-access-logs', title: 'Relatório de acessos', icon: 'fas fa-chart-line', url: '/admin/access-logs', roles: managerRoles },
      { id: 'admin-points', title: 'Ranking de pontos', icon: 'fas fa-trophy', url: '/admin/points-ranking', roles: managerRoles },
      { id: 'admin-point-rules', title: 'Regras de pontuação', icon: 'fas fa-sliders-h', url: '/admin/point-rules', roles: managerRoles },
      { id: 'admin-users', title: 'Gerenciar usuários', icon: 'fas fa-users', url: '/admin/users', roles: ['admin', 'superadmin'] },
      { id: 'admin-online-users', title: 'Usuários online', icon: 'fas fa-user-check', url: '/admin/online-users', roles: ['admin', 'superadmin'] }
    ];
    const normalizedQuery = this.normalize(query);

    return of(pages
      .filter(page => page.roles.includes(role) && this.normalize(`${page.title} área administrativa`).includes(normalizedQuery))
      .map(page => ({
        id: page.id,
        title: page.title,
        category: 'Área administrativa',
        icon: page.icon,
        url: page.url,
        type: 'page' as const
      })));
  }

}

