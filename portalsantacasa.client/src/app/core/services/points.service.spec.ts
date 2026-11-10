import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PointsService } from './points.service';
import { environment } from '../../../environments/environment';

describe('PointsService', () => {
  let service: PointsService;
  let http: HttpTestingController;
  let previousIdentity: string | null;
  const key = 'publicAccessIdentity';
  const base = `${environment.apiUrl}/points`;
  const identity = { name: 'Maria Silva', re: '0012', sector: 'TI' };
  const event = { id: 1, ...identity, eventType: 'news_read', referenceId: '7', points: 5, createdAt: '2026-11-10T10:00:00Z' };
  beforeEach(() => {
    previousIdentity = sessionStorage.getItem(key);
    sessionStorage.removeItem(key);
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PointsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    previousIdentity === null ? sessionStorage.removeItem(key) : sessionStorage.setItem(key, previousIdentity);
    vi.restoreAllMocks();
  });

  it('persists a trimmed complete identity while keeping leading zeros in the employee number', () => {
    service.saveIdentity({ name: ' Maria Silva ', re: ' 0012 ', sector: ' TI ' });
    expect(service.getSavedIdentity()).toEqual(identity);
    expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual(identity);
  });
  for (const missing of ['name', 're', 'sector']) {
    it(`preserves a saved identity when the replacement has an empty ${missing}`, () => {
      service.saveIdentity(identity);
      service.saveIdentity({ ...identity, [missing]: '  ' });
      expect(service.getSavedIdentity()).toEqual(identity);
    });
  }
  for (const stored of ['null', '{}', '{"name":"Maria"}', '{"name":"Maria","re":"12","sector":" "}']) {
    it(`rejects incomplete stored identity ${stored}`, () => {
      sessionStorage.setItem(key, stored);
      expect(service.getSavedIdentity()).toBeNull();
    });
  }
  it('discards malformed stored JSON instead of breaking the caller', () => {
    sessionStorage.setItem(key, '{broken');
    expect(service.getSavedIdentity()).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
  });
  it('completes without requesting or emitting points when no identity is saved', () => {
    const emitted: unknown[] = [];
    let completed = false;
    service.registerFromSavedIdentity({ eventType: 'news_read', referenceId: '7' }).subscribe({ next: value => emitted.push(value), complete: () => completed = true });
    expect(emitted).toEqual([]);
    expect(completed).toBe(true);
    http.expectNone(() => true);
  });
  it('combines saved identity with the event payload before registering points', () => {
    service.saveIdentity(identity);
    service.registerFromSavedIdentity({ eventType: 'news_read', referenceId: '7', referenceTitle: 'Campanha', timeSeconds: 30 }).subscribe(value => expect(value).toEqual(event));
    const request = http.expectOne(`${base}/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ ...identity, eventType: 'news_read', referenceId: '7', referenceTitle: 'Campanha', timeSeconds: 30 });
    request.flush(event);
  });
  it('treats failed points registration as a completed optional action', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const emitted: unknown[] = [];
    let completed = false;
    service.register({ ...identity, eventType: 'news_read' }).subscribe({ next: value => emitted.push(value), complete: () => completed = true });
    http.expectOne(`${base}/register`).flush('offline', { status: 503, statusText: 'Unavailable' });
    expect(completed).toBe(true);
    expect(emitted).toEqual([]);
  });
  it('uses a default ranking limit and supports an explicit limit', () => {
    for (const limit of [undefined, 10]) {
      service.getRanking(limit).subscribe(items => expect(items).toEqual([]));
      const request = http.expectOne(req => req.url === `${base}/ranking`);
      expect(request.request.params.get('limit')).toBe(limit === undefined ? '500' : '10');
      request.flush([]);
    }
  });
  it('includes only supplied event filters and uses default pagination', () => {
    service.getEvents().subscribe(items => expect(items).toEqual([event]));
    const request = http.expectOne(req => req.url === `${base}/events`);
    expect(request.request.params.keys().sort()).toEqual(['page', 'pageSize']);
    expect(request.request.params.get('page')).toBe('1');
    expect(request.request.params.get('pageSize')).toBe('500');
    request.flush([event]);
  });
  it('sends all selected event filters and pagination intact', () => {
    service.getEvents({ re: '0012', eventType: 'news_read', referenceId: '7', page: 2, pageSize: 25 }).subscribe();
    const request = http.expectOne(req => req.url === `${base}/events`);
    expect(request.request.params.get('re')).toBe('0012');
    expect(request.request.params.get('eventType')).toBe('news_read');
    expect(request.request.params.get('referenceId')).toBe('7');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('25');
    request.flush([]);
  });
  it('loads scoring rules and sends explicit zero points and a disabled rule', () => {
    const rule = { id: 3, eventType: 'news_read', points: 0, bonus: 0, isActive: false, description: 'Suspensa' };
    service.getRules().subscribe(rules => expect(rules).toEqual([rule]));
    http.expectOne(`${base}/rules`).flush([rule]);
    const update = { points: 0, bonus: 0, isActive: false, description: 'Suspensa' };
    service.updateRule(3, update).subscribe(value => expect(value).toEqual(rule));
    const request = http.expectOne(`${base}/rules/3`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(update);
    request.flush(rule);
  });
});
