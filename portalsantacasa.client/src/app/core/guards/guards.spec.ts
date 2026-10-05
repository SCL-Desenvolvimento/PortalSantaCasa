import { describe, expect, it, vi } from "vitest";
import { ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { RoleGuard } from './role.guard';

describe('Access guards', () => {
    for (const [loggedIn, expired, allowed] of [[false, true, false], [true, true, false], [true, false, true]]) {
        it(`checks login and expiration: ${loggedIn}/${expired}`, () => {
            const auth: any = { isLoggedIn: () => loggedIn, isTokenExpired: () => expired, logout: vi.fn() };
            const router: any = { navigate: vi.fn() };
            expect(new AuthGuard(auth, router).canActivate()).toBe(allowed);
            expect(vi.mocked(auth.logout).mock.calls.length).toBe(allowed ? 0 : 1);
        });
    }
    for (const [role, allowed] of [['viewer', false], ['admin', true], ['Admin', true], ['superadmin', true], [null, false]]) {
        it(`enforces administrative roles for ${role}`, () => {
            const denied = new UrlTree();
            const auth: any = { getUserInfo: () => role };
            const router: any = { createUrlTree: () => denied };
            const route = { data: { roles: ['admin'] } } as unknown as ActivatedRouteSnapshot;
            expect(new RoleGuard(auth, router).canActivate(route)).toBe(allowed ? true : denied);
        });
    }
});
