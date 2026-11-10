import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { OnlineService } from './online.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
    let service: AuthService;
    let http: HttpTestingController;
    let online: any;
    let previousToken: string | null;
    const jwt = (payload: object) => `${btoa('{}')}.${btoa(JSON.stringify(payload))}.signature`;

    beforeEach(() => {
        previousToken = localStorage.getItem('jwt');
        localStorage.removeItem('jwt');
        online = { startConnection: vi.fn(), stopConnection: vi.fn() };
        TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [{ provide: OnlineService, useValue: online }] });
        service = TestBed.inject(AuthService);
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => {
        http.verify();
        previousToken === null ? localStorage.removeItem('jwt') : localStorage.setItem('jwt', previousToken);
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('stores the session token and connects presence after a normal login', () => {
        service.login('user', 'password').subscribe();
        const request = http.expectOne(`${environment.apiUrl}/auth/login`);
        expect(request.request.body).toEqual({ userName: 'user', password: 'password' });
        request.flush({ precisaTrocarSenha: false, token: 'session' });
        expect(service.getToken()).toBe('session');
        expect(online.startConnection).toHaveBeenCalledWith('session');
    });
    it('does not treat a first access token as a regular session', () => {
        localStorage.setItem('jwt', 'old-session');
        service.login('user', 'MV').subscribe();
        http.expectOne(`${environment.apiUrl}/auth/login`).flush({ precisaTrocarSenha: true, token: 'temporary' });
        expect(service.getToken()).toBeNull();
        expect(online.startConnection).not.toHaveBeenCalled();
    });
    for (const token of ['invalid-token', jwt({}), jwt({ exp: 1 })]) {
        it(`rejects missing or expired claims: ${token}`, () => { localStorage.setItem('jwt', token); expect(service.isTokenExpired()).toBe(true); });
    }
    it('parses user IDs as numbers and accepts an unexpired token', () => {
        localStorage.setItem('jwt', jwt({ id: '12', role: 'editor', exp: Math.floor(Date.now() / 1000) + 60 }));
        expect(service.isTokenExpired()).toBe(false);
        expect(service.getUserInfo('id')).toBe(12);
        expect(service.getUserInfo('role')).toBe('editor');
    });
    it('propagates a rejected login without replacing an existing token or opening presence', () => {
        localStorage.setItem('jwt', 'old-session');
        let status: number | undefined;
        service.login('user', 'wrong').subscribe({ error: error => status = error.status });
        const request = http.expectOne(`${environment.apiUrl}/auth/login`);
        expect(request.request.method).toBe('POST');
        request.flush('invalid credentials', { status: 401, statusText: 'Unauthorized' });
        expect(status).toBe(401);
        expect(service.getToken()).toBe('old-session');
        expect(online.startConnection).not.toHaveBeenCalled();
    });
    it('starts the registered session when registration returns a token', () => {
        service.register('maria@example.com', 'secret').subscribe();
        const request = http.expectOne(`${environment.apiUrl}/auth/register`);
        expect(request.request.method).toBe('POST');
        expect(request.request.body).toEqual({ email: 'maria@example.com', password: 'secret' });
        request.flush({ token: 'registered-session' });
        expect(service.isLoggedIn()).toBe(true);
        expect(service.getToken()).toBe('registered-session');
        expect(online.startConnection).toHaveBeenCalledWith('registered-session');
    });
    it('does not create a session when registration returns no token', () => {
        service.register('maria@example.com', 'secret').subscribe();
        http.expectOne(`${environment.apiUrl}/auth/register`).flush({});
        expect(service.isLoggedIn()).toBe(false);
        expect(online.startConnection).not.toHaveBeenCalled();
    });
    it('clears the session and stops presence on logout before navigating home', () => {
        localStorage.setItem('jwt', 'session');
        vi.stubGlobal('location', { href: '/admin/chat' });
        service.logout();
        expect(service.getToken()).toBeNull();
        expect(service.isLoggedIn()).toBe(false);
        expect(online.stopConnection).toHaveBeenCalledOnce();
        expect(location.href).toBe('/');
    });
    it('returns no identity for absent or malformed tokens', () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        expect(service.getUserInfo()).toBeNull();
        expect(service.isTokenExpired()).toBe(true);
        localStorage.setItem('jwt', 'malformed');
        expect(service.getUserInfo()).toBeNull();
        expect(errorLog).toHaveBeenCalledOnce();
    });
    it('returns a complete identity and preserves an absent ID claim', () => {
        const identity = { id: '12', email: 'maria@example.com', username: 'maria', role: 'viewer', department: 'TI' };
        localStorage.setItem('jwt', jwt(identity));
        expect(service.getUserInfo()).toEqual({ ...identity, id: 12 });
        localStorage.setItem('jwt', jwt({ role: 'viewer' }));
        expect(service.getUserInfo()).toEqual({ role: 'viewer' });
    });
});
