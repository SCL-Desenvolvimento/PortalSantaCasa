import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-admin-header',
  standalone: false,

  templateUrl: './admin-header.component.html',
  styleUrl: './admin-header.component.css'
})
export class AdminHeaderComponent {

  @Input() pageTitle: string = '';
  @Input() userInfo: string = '';
  @Output() onLogout = new EventEmitter<void>();

  logout(): void {
    this.onLogout.emit();
  }
}
