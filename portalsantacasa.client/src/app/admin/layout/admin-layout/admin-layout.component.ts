import { Component, OnInit } from '@angular/core';
import { Router, ActivationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: false,
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit {
  pageTitle: string = 'Dashboard';
  userInfo: string = '';
  constructor(private authService: AuthService, private router: Router) {
    this.router.events.pipe(
      filter((event): event is ActivationEnd => event instanceof ActivationEnd),
      filter(event => event.snapshot.children.length === 0),
      map(event => event.snapshot.data['title'])
    ).subscribe(title => {
      this.pageTitle = title || 'Dashboard';
    });
  }

  ngOnInit(): void {
    this.userInfo = this.authService.getUserUserName() ?? '';
  }

  logout(): void {
    this.authService.logout();
  }
}
