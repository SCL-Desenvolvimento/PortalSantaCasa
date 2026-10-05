import { afterEach, beforeEach, describe, expect, vi } from "vitest";
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { OnlineService } from './online.service';

describe('OnlineService', () => {
    let service: OnlineService;
    let http: HttpTestingController;
    let previousToken: string | null;
    let hub: signalR.HubConnection;
    let closed: () => void;
    let usersOnline: () => void;

    beforeEach(() => {
        previousToken = localStorage.getItem('jwt');
        localStorage.setItem('jwt', 'session');
        hub = {
            state: signalR.HubConnectionState.Disconnected,
            start: vi.fn().mockImplementation(() => Promise.reject(new Error('offline'))),
            stop: vi.fn().mockImplementation(() => {
                closed?.();
                return Promise.resolve();
            }),
            on: (_event: string, handler: () => void) => usersOnline = handler,
            onreconnected: () => { },
            onclose: (handler: () => void) => closed = handler
        } as unknown as signalR.HubConnection;
        vi.spyOn(signalR.HubConnectionBuilder.prototype, 'build').mockReturnValue(hub);
        vi.spyOn(console, 'warn');
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(OnlineService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        service.ngOnDestroy();
        http.verify();
        previousToken === null ? localStorage.removeItem('jwt') : localStorage.setItem('jwt', previousToken);
    });

    it('keeps HTTP presence working when the realtime hub is unavailable', fakeAsync(() => {
        void service.startConnection();
        flushMicrotasks();
        const heartbeat = http.expectOne(`${environment.apiUrl}/user/heartbeat`);
        expect(heartbeat.request.method).toBe('POST');
        heartbeat.flush(null);
        http.expectOne(`${environment.apiUrl}/user/online`).flush([{ id: 12, username: 'Maria' }]);
        expect(service.onlineUsers$.value).toEqual([{ id: 12, userName: 'Maria' }]);

        tick(30000);
        http.expectOne(`${environment.apiUrl}/user/heartbeat`).flush(null);
        http.expectOne(`${environment.apiUrl}/user/online`).flush([{ Id: 12, Username: 'Maria' }]);
        void service.stopConnection();
        flushMicrotasks();
    }));

    it('uses the API list when SignalR announces a presence change', fakeAsync(() => {
        void service.startConnection();
        flushMicrotasks();
        http.expectOne(`${environment.apiUrl}/user/heartbeat`).flush(null);
        http.expectOne(`${environment.apiUrl}/user/online`).flush([{ id: 12, userName: 'Maria' }]);
        usersOnline();
        http.expectOne(`${environment.apiUrl}/user/online`).flush([{ id: 34, userName: 'José' }]);
        expect(service.onlineUsers$.value).toEqual([{ id: 34, userName: 'José' }]);
        void service.stopConnection();
        flushMicrotasks();
    }));

    it('cancels pending requests and prevents reconnection after an explicit stop', fakeAsync(() => {
        void service.startConnection();
        flushMicrotasks();
        http.expectOne(`${environment.apiUrl}/user/heartbeat`).flush(null);
        const query = http.expectOne(`${environment.apiUrl}/user/online`);
        void service.stopConnection();
        flushMicrotasks();
        expect(query.cancelled).toBe(true);
        expect(service.onlineUsers$.value).toEqual([]);
        tick(60000);
        expect(hub.start).toHaveBeenCalledTimes(1);
        http.expectNone(`${environment.apiUrl}/user/heartbeat`);
    }));

    it('does not accumulate heartbeat requests while the API is slow', fakeAsync(() => {
        void service.startConnection();
        flushMicrotasks();
        const heartbeat = http.expectOne(`${environment.apiUrl}/user/heartbeat`);
        tick(60000);
        http.expectNone(`${environment.apiUrl}/user/heartbeat`);
        void service.stopConnection();
        flushMicrotasks();
        expect(heartbeat.cancelled).toBe(true);
    }));

    it('normalizes API field names and discards invalid IDs', () => {
        service.getOnlineViaHttp().subscribe(users => {
            expect(users).toEqual([{ id: 12, userName: 'Maria' }, { id: 34, userName: 'José' }]);
        });
        http.expectOne(`${environment.apiUrl}/user/online`).flush([
            { id: 12, userName: 'Maria' }, { Id: 34, Username: 'José' },
            { id: null }, { id: -1 }, { id: 1.5 }, { id: 'invalid' }, {}
        ]);
    });
});
