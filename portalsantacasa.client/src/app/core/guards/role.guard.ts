import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {

    const roles = route.data['roles'] as string[];
    const userRole = this.auth.getUserInfo('role');
    if (!userRole) {
      return this.router.createUrlTree(['/']);
    }

    if (userRole.toLowerCase() === 'superadmin') {
      return true;
    }

    if (!roles.some(role => role.toLowerCase() === userRole.toLowerCase())) {
      return this.router.createUrlTree(['/']);
    }

    return true;
  }
}
