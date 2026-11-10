import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SearchResult, SearchService } from './search.service';
import { environment } from '../../../environments/environment';

describe('SearchService', () => {
  let service: SearchService;
  let http: HttpTestingController;
  const result: SearchResult = { id: 'news-7', title: 'Campanha', category: 'Notícias', icon: 'news', type: 'news', url: '/noticias/7' };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SearchService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('avoids all requests for blank and one-character searches', () => {
    for (const query of ['', '  ', ' a ']) {
      service.search(query, 'admin').subscribe(results => expect(results).toEqual([]));
      service.publicSearch(query).subscribe(results => expect(results).toEqual([]));
    }
    http.expectNone(() => true);
  });

  it('trims and encodes public terms while preserving API result links', () => {
    service.publicSearch('  saúde & bem-estar  ').subscribe(results => expect(results).toEqual([result]));
    const request = http.expectOne(`${environment.apiUrl}/public-search?q=sa%C3%BAde%20%26%20bem-estar`);
    expect(request.request.method).toBe('GET');
    request.flush([result]);
  });

  it('finds accented public pages without accents when the API is unavailable', () => {
    service.publicSearch('CARDAPIO').subscribe(results => {
      expect(results).toEqual([expect.objectContaining({ id: 'page-menu', title: 'Cardápio', url: '/?view=menu' })]);
    });
    http.expectOne(`${environment.apiUrl}/public-search?q=CARDAPIO`).flush('offline', { status: 503, statusText: 'Unavailable' });
  });

  it('appends matching local pages after server results', () => {
    service.publicSearch('noticias').subscribe(results => {
      expect(results.map(item => item.id)).toEqual(['news-7', 'page-news']);
    });
    http.expectOne(`${environment.apiUrl}/public-search?q=noticias`).flush([result]);
  });

  it('limits public results to sixteen', () => {
    service.publicSearch('campanha').subscribe(results => {
      expect(results).toHaveLength(16);
      expect(results[15].id).toBe('15');
    });
    http.expectOne(`${environment.apiUrl}/public-search?q=campanha`).flush(Array.from({ length: 25 }, (_, id) => ({ ...result, id: String(id) })));
  });

  for (const role of ['viewer', 'editor']) {
    it(`does not request people or expose user management to ${role}`, () => {
      service.search('usuarios', role).subscribe(results => expect(results).toEqual([]));
      http.expectOne(`${environment.apiUrl}/public-search?q=usuarios`).flush([]);
      http.expectNone(request => request.url.includes('/user/search'));
    });
  }

  it('exposes manager pages to editors but not viewers', () => {
    service.search('gerenciar noticias', 'viewer').subscribe(results => expect(results).toEqual([]));
    http.expectOne(`${environment.apiUrl}/public-search?q=gerenciar%20noticias`).flush([]);
    service.search('gerenciar noticias', 'editor').subscribe(results => {
      expect(results.map(item => item.url)).toEqual(['/admin/news?quality=false']);
    });
    http.expectOne(`${environment.apiUrl}/public-search?q=gerenciar%20noticias`).flush([]);
  });

  it('normalizes admin role and maps people using name/email fallbacks', () => {
    service.search('  Maria & Ana ', 'SUPERADMIN').subscribe(results => {
      expect(results).toEqual([
        result,
        { id: 'user-2', title: 'Maria', category: 'Pessoas', icon: 'fas fa-user', url: '/admin/users?search=Maria', description: 'TI', type: 'user' },
        { id: 'user-3', title: 'Ana Silva', category: 'Pessoas', icon: 'fas fa-user', url: '/admin/users?search=Ana%20Silva', description: 'ana@example.com', type: 'user' }
      ]);
    });
    http.expectOne(`${environment.apiUrl}/public-search?q=Maria%20%26%20Ana`).flush([result]);
    http.expectOne(`${environment.apiUrl}/user/search?q=Maria%20%26%20Ana`).flush([
      { id: 2, username: 'Maria', name: 'Maria Silva', department: 'TI', email: 'maria@example.com' },
      { id: 3, username: '', name: 'Ana Silva', department: '', email: 'ana@example.com' }
    ]);
  });

  it('keeps local and public matches when people lookup fails', () => {
    service.search('usuarios', 'admin').subscribe(results => {
      expect(results.map(item => item.id)).toEqual(['admin-users', 'admin-online-users', 'news-7']);
    });
    http.expectOne(`${environment.apiUrl}/public-search?q=usuarios`).flush([result]);
    http.expectOne(`${environment.apiUrl}/user/search?q=usuarios`).flush(null, { status: 403, statusText: 'Forbidden' });
  });

  it('deduplicates by both type and ID and caps combined results at twenty', () => {
    service.search('campanha', 'admin').subscribe(results => {
      expect(results).toHaveLength(20);
      expect(results.filter(item => item.id === 'news-7')).toHaveLength(1);
      expect(results[19].id).toBe('user-4');
    });
    http.expectOne(`${environment.apiUrl}/public-search?q=campanha`).flush([
      result, result, ...Array.from({ length: 15 }, (_, id) => ({ ...result, id: String(id) }))
    ]);
    http.expectOne(`${environment.apiUrl}/user/search?q=campanha`).flush(Array.from({ length: 10 }, (_, id) => ({ id, username: `Pessoa ${id}`, department: 'TI' })));
  });
});
