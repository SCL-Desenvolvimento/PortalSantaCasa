import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NewsService } from './news.service';
import { environment } from '../../../environments/environment';

describe('NewsService', () => {
  let service: NewsService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/news`;
  const news = { id: 7, title: 'Campanha', summary: 'Saúde', content: '<p>Campanha de saúde</p>', imageUrl: '/images/news.png', isActive: true, isQualityMinute: false, createdAt: '2026-11-10T10:00:00Z', category: 'Saúde' };
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NewsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  for (const management of [false, true]) {
    const path = management ? '/management/paginated' : '/paginated';
    it(`uses default pagination without an unspecified quality filter for ${management ? 'management' : 'public'} news`, () => {
      const result = management ? service.getManagementNewsPaginated() : service.getNewsPaginated();
      result.subscribe(value => expect(value.news).toEqual([news]));
      const request = http.expectOne(req => req.url === `${base}${path}`);
      expect(request.request.params.get('page')).toBe('1');
      expect(request.request.params.get('perPage')).toBe('10');
      expect(request.request.params.get('status')).toBe('all');
      expect(request.request.params.has('isQualityMinute')).toBe(false);
      request.flush({ currentPage: 1, perPage: 10, pages: 1, news: [news] });
    });
    for (const quality of [false, true]) {
      it(`preserves quality=${quality} and selected paging/status on ${management ? 'management' : 'public'} lookup`, () => {
        const result = management ? service.getManagementNewsPaginated(2, 25, quality, 'active') : service.getNewsPaginated(2, 25, quality, 'active');
        result.subscribe();
        const request = http.expectOne(req => req.url === `${base}${path}`);
        expect(request.request.params.get('page')).toBe('2');
        expect(request.request.params.get('perPage')).toBe('25');
        expect(request.request.params.get('status')).toBe('active');
        expect(request.request.params.get('isQualityMinute')).toBe(String(quality));
        request.flush({ currentPage: 2, perPage: 25, pages: 2, news: [] });
      });
    }
  }
  it('keeps public and management item endpoints distinct', () => {
    service.getNewsById(7).subscribe(value => expect(value).toEqual(news));
    http.expectOne(`${base}/7`).flush(news);
    service.getManagementNewsById(7).subscribe(value => expect(value).toEqual(news));
    http.expectOne(`${base}/management/7`).flush(news);
    service.getNews().subscribe(value => expect(value).toEqual([news]));
    http.expectOne(`${base}/all`).flush([news]);
  });
  it('requests totals for the selected news type', () => {
    service.getNewsTotals(false).subscribe(value => expect(value).toEqual({ totalNews: 10, activeNews: 7, inactiveNews: 3 }));
    http.expectOne(`${base}/totals?isQualityMinute=false`).flush({ totalNews: 10, activeNews: 7, inactiveNews: 3 });
  });
  it('sends multipart creation/update data and deletes the selected news ID', () => {
    const form = new FormData();
    form.append('title', 'Campanha');
    form.append('image', new File(['image'], 'news.png', { type: 'image/png' }));
    service.createNews(form).subscribe(value => expect(value).toEqual(news));
    const create = http.expectOne(base);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toBe(form);
    create.flush(news);
    service.updateNews(7, form).subscribe(value => expect(value).toEqual(news));
    const update = http.expectOne(`${base}/7`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toBe(form);
    update.flush(news);
    service.deleteNews(7).subscribe();
    const deletion = http.expectOne(`${base}/7`);
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush(null);
  });
  for (const fixture of [
    { body: { error: 'Notícia indisponível' }, message: 'Notícia indisponível' },
    { body: null, message: 'Ocorreu um erro. Tente novamente mais tarde.' }
  ]) {
    it(`presents ${fixture.message} on server failure`, () => {
      let error: Error | undefined;
      service.getNewsById(7).subscribe({ error: failure => error = failure });
      http.expectOne(`${base}/7`).flush(fixture.body, { status: 404, statusText: 'Not Found' });
      expect(error?.message).toBe(fixture.message);
    });
  }
  it('presents browser network failures to subscribers', () => {
    let error: Error | undefined;
    service.getNewsById(7).subscribe({ error: failure => error = failure });
    http.expectOne(`${base}/7`).error(new ErrorEvent('error', { message: 'Network offline' }));
    expect(error?.message).toBe('Erro: Network offline');
  });
});
