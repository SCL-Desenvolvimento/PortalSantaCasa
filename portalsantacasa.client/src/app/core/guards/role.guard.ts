import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {

    const roles = route.data['roles'] as string[];
    const userRole = this.auth.getUserInfo('role');
    console.log(userRole)
    if (!userRole) {
      return false;
    }

    if (userRole.toLowerCase() === 'superadmin') {
      return true;
    }

    if (!roles.includes(userRole.toLowerCase())) {
      this.router.navigate(['/']);
      return false;
    }

    return true;
  }
}
