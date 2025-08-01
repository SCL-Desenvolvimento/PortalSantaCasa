import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin.service';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-users',
  standalone: false,
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  message: { text: string, type: string } | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadUsersAdmin();
  }

  loadUsersAdmin(): void {
    this.adminService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
      },
      error: (error) => {
        this.showMessage(`Erro ao carregar usuários: ${error.message}`, 'error');
      }
    });
  }

  showUsersManagement(): void {
    // Implement if needed (e.g., open modal for new user)
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
