import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../services/user.service';
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

  showModal = false;
  isEdit = false;
  userData: User = this.resetUser();

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    // this.loadUsersAdmin();
  }

  showUsersManagement(user?: User): void {
    this.isEdit = !!user;
    this.userData = user ? { ...user } : this.resetUser();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveUser(): void {
    if (this.isEdit) {
      const index = this.users.findIndex(u => u.id === this.userData.id);
      if (index !== -1) this.users[index] = { ...this.userData };
      this.showMessage('Usuário atualizado com sucesso', 'success');
    } else {
      this.userData.id = this.generateId();
      this.userData.created_at = new Date().toISOString();
      this.users.push({ ...this.userData });
      this.showMessage('Usuário criado com sucesso', 'success');
    }

    this.closeModal();
  }

  resetUser(): User {
    return {
      username: '',
      email: '',
      user_type: '',
      is_active: true,
      created_at: ''
    };
  }

  generateId(): number {
    return this.users.length > 0 ? Math.max(...this.users.map(u => u.id || 0)) + 1 : 1;
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
