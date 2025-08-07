import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {

  isLoggedIn = false;

  constructor(private authService: AuthService, private router: Router) { }

  showLogin = false;

  loginData = {
    username: '',
    password: ''
  };

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
  }

  openLoginModal() {
    this.showLogin = true;
  }

  login() {
    this.authService.login(this.loginData.username, this.loginData.password).subscribe({
      next: (data) => {
        console.log("Usuário logado!", data)
        this.isLoggedIn = true;
        this.router.navigate(['/admin']);
      },
      error: (error) => {
        console.log(error)
      }
    });
    this.closeLoginModal();
  }

  closeLoginModal() {
    this.showLogin = false;
  }

  goToAdmin() {
    this.router.navigate(['/admin']);
  }
}

