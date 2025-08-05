import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { User } from '../../../models/user.model';
import { environment } from '../../../../environments/environment';

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
  modalTitle: string = '';
  selectedUsers: User | null = null;
  imageFile: File | null = null;

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.loadUsersAdmin();
  }

  loadUsersAdmin(): void {
    this.userService.getUser().subscribe({
      next: (data) => {
        this.users = data.map((user) => ({
          id: user.id,
          email: user.email,
          userType: user.userType,
          username: user.username,
          isActive: user.isActive,
          createdAt: user.createdAt,
          photoUrl: `${environment.imageServerUrl}${user.photoUrl}`
        }));
      },
      error: (error) => {
        this.showMessage(`Erro ao carregar usuários: ${error.message}`, 'error');
      }
    });
  }

  showUsersManagement(userId: number | null = null): void {
    this.isEdit = userId !== null;
    this.modalTitle = this.isEdit ? 'Editar Notícia' : 'Nova Notícia';
    if (userId) {
      this.userService.getUserById(userId).subscribe({
        next: (user) => {
          this.selectedUsers = user;
          this.userData = { ...user, photoUrl: `${environment.imageServerUrl}${user.photoUrl}` };
          this.openModal();
        },
        error: (error) => {
          this.showMessage(`Erro ao carregar usuário: ${error.message}`, 'error');
        }
      });
    } else {
      this.selectedUsers = null;
      this.userData = this.resetUser();
      this.imageFile = null;
      this.openModal();
    }
  }

  saveUser(): void {
    const formData = new FormData();
    formData.append('username', this.userData.username);
    formData.append('email', this.userData.email || '');
    formData.append('createdAt', this.userData.createdAt);
    formData.append('userType', this.userData.userType);
    formData.append('isActive', this.userData.isActive.toString());
    if (this.imageFile) {
      formData.append('file', this.imageFile, this.imageFile.name);
    }

    this.submitUserForm(formData);

  }

  submitUserForm(formData: FormData): void {
    const request = this.isEdit && this.selectedUsers?.id
      ? this.userService.updateUser(this.selectedUsers.id, formData)
      : this.userService.createUser(formData);
    request.subscribe({
      next: (data) => {
        this.closeModal();
        //this.showMessage(data.message, 'success');
        this.loadUsersAdmin();
      },
      error: (error) => {
        this.showMessage(error.message || 'Erro ao salvar usuário', 'error');
      }
    });
  }

  deleteUser(userId?: number): void {
    if (!userId) {
      console.warn('ID inválido ao tentar deletar usuário.');
      return;
    }

    if (confirm('Tem certeza que deseja excluir esta usuário?')) {
      this.userService.deleteUser(userId).subscribe({
        next: (data) => {
          console.log(data);
          //this.showMessage(data.message, 'success');
          this.loadUsersAdmin();
        },
        error: (error) => {
          this.showMessage(error.message || 'Erro ao excluir usuário', 'error');
        }
      });
    }
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  resetUser(): User {
    return {
      username: '',
      email: '',
      userType: '',
      isActive: true,
      createdAt: '',
      photoUrl: ''
    };
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }

  onFileChange(event: Event, type: 'image' | 'document' | 'photo'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      if (type === 'image') {
        this.imageFile = input.files[0];
      }
    }
  }
}
