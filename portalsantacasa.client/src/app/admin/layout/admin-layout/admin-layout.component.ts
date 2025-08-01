import { Component, OnInit } from '@angular/core';
import { Router, ActivationEnd } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { AdminService } from '../../../services/admin.service';

@Component({
  selector: 'app-admin-layout',
  standalone: false,
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit {
  pageTitle: string = 'Dashboard';
  userInfo: string = '';
  constructor(private adminService: AdminService, private router: Router) {
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
    //this.adminService.checkAuth().subscribe({
    //  next: (data) => {
    //    this.userInfo = `Olá, ${data.user.username}`;
    //  },
    //  error: () => {
    //    this.router.navigate(['/']);
    //  }
    //});
  }

  logout(): void {
    this.adminService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: () => {
        this.router.navigate(['/']);
      }
    });
  }

}
