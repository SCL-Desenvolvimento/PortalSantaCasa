import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
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
    this.closeLoginModal();
  }

  closeLoginModal() {
    this.showLogin = false;
  }

}
