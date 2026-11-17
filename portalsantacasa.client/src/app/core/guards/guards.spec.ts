import { describe, expect, it, vi } from "vitest";
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { RoleGuard } from './role.guard';

describe('Access guards', () => {
    for (const [loggedIn, expired, allowed] of [[false, true, false], [true, true, false], [true, false, true]]) {
        it(`checks login and expiration: ${loggedIn}/${expired}`, () => {
            const redirect = new UrlTree();
            const auth: any = { isLoggedIn: () => loggedIn, isTokenExpired: () => expired, endSession: vi.fn() };
            const router: any = { createUrlTree: vi.fn(() => redirect) };
            const state = { url: '/admin/pops?documento=4' } as RouterStateSnapshot;
            expect(new AuthGuard(auth, router).canActivate({} as ActivatedRouteSnapshot, state)).toBe(allowed ? true : redirect);
            expect(vi.mocked(auth.endSession).mock.calls.length).toBe(allowed ? 0 : 1);
            if (!allowed) expect(router.createUrlTree).toHaveBeenCalledWith(['/'], { queryParams: { next: state.url } });
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
