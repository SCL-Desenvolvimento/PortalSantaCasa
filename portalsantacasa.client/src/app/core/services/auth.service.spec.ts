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
    afterEach(() => { http.verify(); previousToken === null ? localStorage.removeItem('jwt') : localStorage.setItem('jwt', previousToken); });

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
});
