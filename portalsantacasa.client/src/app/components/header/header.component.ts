import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {

  isLoggedIn = false;
  showLogin = false;
  mostrarTrocaSenha = false;
  userIdParaTroca: number | null = null;

  loginData = {
    username: '',
    password: ''
  };

  newPassword = '';
  confirmPassword = '';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
  }

  openLoginModal() {
    this.showLogin = true;
  }

  login() {
    this.authService.login(this.loginData.username, this.loginData.password).subscribe({
      next: (res) => {
        if (res.precisaTrocarSenha) {
          // fluxo troca de senha
          this.userIdParaTroca = res.userId;
          this.mostrarTrocaSenha = true;
        } else {
          // fluxo login normal
          this.isLoggedIn = true;
          this.router.navigate(['/admin']);
          this.closeLoginModal();
        }
      },
      error: () => this.toastr.error('Usuário ou senha inválidos.')
    });
  }

  changePassword() {
    if (this.newPassword !== this.confirmPassword) {
      this.toastr.error('As senhas não coincidem');
      return;
    }

    if (!this.userIdParaTroca) return;

    this.userService.changePassword(this.userIdParaTroca, this.newPassword).subscribe({
      next: () => {
        this.toastr.success('Senha alterada com sucesso, faça login novamente!');
        this.resetForms();
      },
      error: () => this.toastr.error('Erro ao alterar senha')
    });
  }

  closeLoginModal() {
    this.showLogin = false;
    this.resetForms();
  }

  goToAdmin() {
    this.router.navigate(['/admin']);
  }

  private resetForms() {
    this.mostrarTrocaSenha = false;
    this.userIdParaTroca = null;
    this.loginData = { username: '', password: '' };
    this.newPassword = '';
    this.confirmPassword = '';
  }
}
