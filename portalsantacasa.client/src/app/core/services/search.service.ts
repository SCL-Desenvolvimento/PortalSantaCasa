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
  type: 'user' | 'document' | 'news' | 'event' | 'page' | 'menu';
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  search(query: string): Observable<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return of([]);
    }

    const searchTerm = query.trim().toLowerCase();

    // Realizar buscas paralelas em diferentes endpoints
    const searches = [
      this.searchUsers(searchTerm),
      this.searchDocuments(searchTerm),
      this.searchNews(searchTerm),
      this.searchEvents(searchTerm),
      this.searchPages(searchTerm)
    ];

    return forkJoin(searches).pipe(
      map(results => {
        // Combinar todos os resultados e limitar a 10 itens
        const allResults = results.flat();
        return allResults.slice(0, 10);
      }),
      catchError(error => {
        console.error('Erro na busca:', error);
        return of([]);
      })
    );
  }

  private searchUsers(query: string): Observable<SearchResult[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/search?q=${encodeURIComponent(query)}`).pipe(
      map(users => users.map(user => ({
        id: `user-${user.id}`,
        title: user.username || user.name,
        category: 'Pessoas',
        icon: 'fas fa-user',
        url: `/admin/users/${user.id}`,
        description: user.department || user.email,
        type: 'user' as const
      }))),
      catchError(() => of([]))
    );
  }

  private searchDocuments(query: string): Observable<SearchResult[]> {
    return this.http.get<any[]>(`${this.apiUrl}/document/search?q=${encodeURIComponent(query)}`).pipe(
      map(documents => documents.map(doc => ({
        id: `document-${doc.id}`,
        title: doc.name || doc.title,
        category: 'Documentos',
        icon: 'fas fa-file-alt',
        url: `/admin/documents/${doc.id}`,
        description: doc.fileName,
        type: 'document' as const
      }))),
      catchError(() => of([]))
    );
  }

  private searchNews(query: string): Observable<SearchResult[]> {
    return this.http.get<any[]>(`${this.apiUrl}/news/search?q=${encodeURIComponent(query)}`).pipe(
      map(news => news.map(item => ({
        id: `news-${item.id}`,
        title: item.title,
        category: 'Notícias',
        icon: 'fas fa-newspaper',
        url: `/admin/news/${item.id}`,
        description: item.summary || item.content?.substring(0, 100),
        type: 'news' as const
      }))),
      catchError(() => of([]))
    );
  }

  private searchEvents(query: string): Observable<SearchResult[]> {
    return this.http.get<any[]>(`${this.apiUrl}/event/search?q=${encodeURIComponent(query)}`).pipe(
      map(events => events.map(event => ({
        id: `event-${event.id}`,
        title: event.title || event.name,
        category: 'Eventos',
        icon: 'fas fa-calendar-alt',
        url: `/admin/events/${event.id}`,
        description: event.description,
        type: 'event' as const
      }))),
      catchError(() => of([]))
    );
  }

  private searchPages(query: string): Observable<SearchResult[]> {
    // Busca estática nas páginas do sistema
    const pages = [
      { id: 'dashboard', title: 'Dashboard', category: 'Páginas', icon: 'fas fa-tachometer-alt', url: '/admin/dashboard' },
      { id: 'users', title: 'Usuários', category: 'Páginas', icon: 'fas fa-users', url: '/admin/users' },
      { id: 'news', title: 'Notícias', category: 'Páginas', icon: 'fas fa-newspaper', url: '/admin/news' },
      { id: 'documents', title: 'Documentos', category: 'Páginas', icon: 'fas fa-file-alt', url: '/admin/documents' },
      { id: 'events', title: 'Eventos', category: 'Páginas', icon: 'fas fa-calendar-alt', url: '/admin/events' },
      { id: 'birthdays', title: 'Aniversariantes', category: 'Páginas', icon: 'fas fa-birthday-cake', url: '/admin/birthdays' },
      { id: 'menu', title: 'Cardápio', category: 'Páginas', icon: 'fas fa-utensils', url: '/admin/menu' },
      { id: 'feedbacks', title: 'Feedbacks', category: 'Páginas', icon: 'fas fa-comments', url: '/admin/feedbacks' },
      { id: 'banners', title: 'Banners', category: 'Páginas', icon: 'fas fa-images', url: '/admin/banners' },
      { id: 'stats', title: 'Estatísticas', category: 'Páginas', icon: 'fas fa-chart-bar', url: '/admin/stats' }
    ];

    const filteredPages = pages.filter(page => 
      page.title.toLowerCase().includes(query) || 
      page.category.toLowerCase().includes(query)
    );

    return of(filteredPages.map(page => ({
      ...page,
      type: 'page' as const
    })));
  }
}

