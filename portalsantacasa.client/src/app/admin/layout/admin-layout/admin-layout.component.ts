import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: false,
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit {
  sidebarCollapsed = false;
  userInfo: string = '';
  constructor(private authService: AuthService) {
  }

  ngOnInit(): void {
    this.userInfo = this.authService.getUserInfo('username') ?? '';
  }

  logout(): void {
    this.authService.logout();
  }

  onSidebarToggle(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }
}
