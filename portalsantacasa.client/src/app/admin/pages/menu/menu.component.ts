import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin.service';
import { Menu } from '../../../models/menu.model';

@Component({
  selector: 'app-menu',
  standalone: false,
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent implements OnInit {
  menuItems: Menu[] = [];
  message: { text: string, type: string } | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadMenuAdmin();
  }

  loadMenuAdmin(): void {
    //this.adminService.getMenu().subscribe({
    //  next: (data) => {
    //    this.menuItems = data;
    //  },
    //  error: (error) => {
    //    this.showMessage(`Erro ao carregar cardápio: ${error.message}`, 'error');
    //  }
    //});
  }

  showMenuManagement(): void {
    // Implement if needed (e.g., open modal for new menu)
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
