import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

  constructor(private authService: AuthService, private router: Router) { }

  showLogin = false;

  loginData = {
    username: '',
    password: ''
  };

  openLoginModal() {
    this.showLogin = true;
  }

  login() {
    console.log(this.loginData);
    this.authService.login(this.loginData.username, this.loginData.password).subscribe(({
      next: (data) => {
        console.log("Usuário logado!", data)
        this.router.navigate(['/admin'])
      },
      error: (error) => {
        console.log(error)
      }
    }))
    this.closeLoginModal();
  }

  closeLoginModal() {
    this.showLogin = false;
  }

}
