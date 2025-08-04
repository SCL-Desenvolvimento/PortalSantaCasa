import { Component, OnInit } from '@angular/core';
import { Router, ActivationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: false,
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
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
    this.checkAuth();
  }

  checkAuth(): void {
    //this.authService.checkAuth().subscribe({
    //  next: (data) => {
    //    this.userInfo = `Olá, ${data.user.username}`;
    //  },
    //  error: () => {
    //    this.router.navigate(['/']);
    //  }
    //});
  }

  logout(): void {
    this.authService.logout();
  }
}
