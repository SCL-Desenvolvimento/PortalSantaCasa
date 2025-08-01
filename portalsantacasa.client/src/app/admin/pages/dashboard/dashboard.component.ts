import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin.service';
import { Stats } from '../../../models/stats.model';

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  stats: Stats | null = null;
  message: { text: string, type: string } | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    console.log('Dashboard carregando...');

    this.loadDashboard();
  }

  loadDashboard(): void {
    this.adminService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
      },
      error: (error) => {
        this.showMessage(`Erro ao carregar dashboard: ${error.message}`, 'error');
      }
    });
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
