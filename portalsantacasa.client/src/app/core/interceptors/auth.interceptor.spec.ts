import { HttpErrorResponse, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { AuthInterceptor } from './auth.interceptor';
import { environment } from '../../../environments/environment';

describe('AuthInterceptor', () => {
  let auth: any;
  let router: any;
  let interceptor: AuthInterceptor;
  let previousToken: string | null;

  beforeEach(() => {
    previousToken = localStorage.getItem('jwt');
    localStorage.setItem('jwt', 'test-token');
    auth = { logout: jasmine.createSpy('logout') };
    router = { navigate: jasmine.createSpy('navigate') };
    interceptor = new AuthInterceptor(router, auth);
  });
  afterEach(() => previousToken === null ? localStorage.removeItem('jwt') : localStorage.setItem('jwt', previousToken));

  for (const url of [`${environment.apiUrl}/news`, '/api/news']) {
    it(`sends JWT to the internal API: ${url}`, () => {
      const handler = { handle: (request: HttpRequest<any>) => {
        expect(request.headers.get('Authorization')).toBe('Bearer test-token'); return of(new HttpResponse());
      } } as HttpHandler;
      interceptor.intercept(new HttpRequest('GET', url), handler).subscribe();
    });
  }

  for (const url of ['https://attacker.example/api/news', '/api-evil/news',
    `${environment.apiUrl}.attacker.example/news`, 'https://user:password@attacker.example/api/news']) {
    it(`does not disclose JWT to ${url}`, () => {
      const handler = { handle: (request: HttpRequest<any>) => {
        expect(request.headers.has('Authorization')).toBeFalse(); return of(new HttpResponse());
      } } as HttpHandler;
      interceptor.intercept(new HttpRequest('GET', url), handler).subscribe();
    });
  }

  for (const url of ['https://attacker.example/api', `${environment.apiUrl}/auth/login`]) {
    it(`does not log out on a 401 from ${url}`, () => {
      const handler = { handle: () => throwError(() => new HttpErrorResponse({ status: 401 })) } as HttpHandler;
      interceptor.intercept(new HttpRequest('GET', url), handler).subscribe({ error: () => {} });
      expect(auth.logout).not.toHaveBeenCalled();
    });
  }
  it('logs out when an internal API request reports an expired session', () => {
    const handler = { handle: () => throwError(() => new HttpErrorResponse({ status: 401 })) } as HttpHandler;
    interceptor.intercept(new HttpRequest('GET', '/api/news'), handler).subscribe({ error: () => {} });
    expect(auth.logout).toHaveBeenCalled(); expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
