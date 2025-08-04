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
  statsData = [
    {
      label: 'Notícias',
      count: 0,
      icon: 'fas fa-newspaper',
      bgClass: 'bg-soft-primary text-primary'
    },
    {
      label: 'Documentos',
      count: 0,
      icon: 'fas fa-file-alt',
      bgClass: 'bg-soft-success text-success'
    },
    {
      label: 'Aniversariantes',
      count: 0,
      icon: 'fas fa-birthday-cake',
      bgClass: 'bg-soft-pink text-pink'
    },
    {
      label: 'Usuários',
      count: 1,
      icon: 'fas fa-users',
      bgClass: 'bg-soft-purple text-purple'
    }
  ];
  message: { text: string, type: string } | null = null;

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    console.log('Dashboard carregando...');

    this.loadDashboard();
  }

  loadDashboard(): void {
  //  this.adminService.getStats().subscribe({
  //    next: (data) => {
  //      this.stats = data;
  //    },
  //    error: (error) => {
  //      this.showMessage(`Erro ao carregar dashboard: ${error.message}`, 'error');
  //    }
  //  });
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
