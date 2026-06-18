import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { PointsService } from '../../../core/services/points.service';

@Injectable({
  providedIn: 'root'
})
export class GamesIdentificationGuard implements CanActivate {
  constructor(
    private pointsService: PointsService,
    private router: Router
  ) { }

  canActivate(): boolean | UrlTree {
    return this.pointsService.getSavedIdentity()
      ? true
      : this.router.createUrlTree(['/games']);
  }
}
