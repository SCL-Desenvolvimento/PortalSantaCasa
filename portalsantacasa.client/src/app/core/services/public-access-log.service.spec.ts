import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PublicAccessLogService } from './public-access-log.service';
import { environment } from '../../../environments/environment';

describe('PublicAccessLogService', () => {
  let service: PublicAccessLogService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/publicaccesslog`;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PublicAccessLogService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('looks up CLT employees by chapa by default and PJ employees by CPF', () => {
    const employee = { re: '0012', name: 'Maria', sector: 'TI' };
    service.getEmployee('0012').subscribe(value => expect(value).toEqual(employee));
    const clt = http.expectOne(req => req.url === `${base}/employee`);
    expect(clt.request.params.get('employmentType')).toBe('CLT');
    expect(clt.request.params.get('chapa')).toBe('0012');
    expect(clt.request.params.has('cpf')).toBe(false);
    clt.flush(employee);
    service.getEmployee('12345678901', 'PJ').subscribe(value => expect(value).toEqual(employee));
    const pj = http.expectOne(req => req.url === `${base}/employee`);
    expect(pj.request.params.get('employmentType')).toBe('PJ');
    expect(pj.request.params.get('cpf')).toBe('12345678901');
    expect(pj.request.params.has('chapa')).toBe(false);
    pj.flush(employee);
  });
  it('records the selected content and employment identity', () => {
    const payload = { re: '0012', name: 'Maria', sector: 'TI', page: 'news', contentId: 7, contentTitle: 'Campanha', employmentType: 'CLT' as const };
    const log = { id: 1, ...payload, accessedAt: '2026-11-10T10:00:00Z' };
    service.create(payload).subscribe(value => expect(value).toEqual(log));
    const request = http.expectOne(base);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(log);
  });
  it('does not send absent report filters', () => {
    service.getReport({}).subscribe(report => expect(report.total).toBe(0));
    const request = http.expectOne(base);
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ currentPage: 1, perPage: 10, total: 0, pages: 0, logs: [] });
  });
  it('sends all report filters including the content and selected page', () => {
    service.getReport({ employmentType: 'PJ', pageType: 'news', startDate: '2026-11-01', endDate: '2026-11-10', sector: 'UTI & TI', contentId: 7, page: 2, pageSize: 20 }).subscribe();
    const request = http.expectOne(req => req.url === base);
    const params = request.request.params;
    expect(params.keys().sort()).toEqual(['contentId', 'employmentType', 'endDate', 'page', 'pageSize', 'pageType', 'sector', 'startDate']);
    expect(params.get('employmentType')).toBe('PJ');
    expect(params.get('pageType')).toBe('news');
    expect(params.get('startDate')).toBe('2026-11-01');
    expect(params.get('endDate')).toBe('2026-11-10');
    expect(params.get('sector')).toBe('UTI & TI');
    expect(params.get('contentId')).toBe('7');
    expect(params.get('page')).toBe('2');
    expect(params.get('pageSize')).toBe('20');
    request.flush({ currentPage: 2, perPage: 20, total: 0, pages: 0, logs: [] });
  });
  it('loads content choices for the requested page type', () => {
    service.getContentOptions('news').subscribe(options => expect(options).toEqual([{ id: 7, title: 'Campanha' }]));
    const request = http.expectOne(req => req.url === `${base}/content-options`);
    expect(request.request.params.get('pageType')).toBe('news');
    request.flush([{ id: 7, title: 'Campanha' }]);
  });
  for (const fixture of [
    { body: { error: 'Identificação inválida' }, message: 'Identificação inválida' },
    { body: null, message: 'Ocorreu um erro. Tente novamente mais tarde.' }
  ]) {
    it(`preserves status and presents ${fixture.message} on server failures`, () => {
      let failure: Error & { status: number } | undefined;
      service.getReport({}).subscribe({ error: error => failure = error });
      http.expectOne(base).flush(fixture.body, { status: 403, statusText: 'Forbidden' });
      expect(failure?.message).toBe(fixture.message);
      expect(failure?.status).toBe(403);
    });
  }
  it('turns browser failures into an error carrying status zero', () => {
    let failure: Error & { status: number } | undefined;
    service.getEmployee('0012').subscribe({ error: error => failure = error });
    http.expectOne(req => req.url === `${base}/employee`).error(new ErrorEvent('error', { message: 'Network offline' }));
    expect(failure?.message).toBe('Erro: Network offline');
    expect(failure?.status).toBe(0);
  });
});
