import { Component, OnInit } from '@angular/core';
import { StatsService } from '../../../services/stats.service';
import { Stats } from '../../../models/stats.model';
import { AuthService } from '../../../services/auth.service';

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
      count: 0,
      icon: 'fas fa-users',
      bgClass: 'bg-soft-purple text-purple'
    }
  ];
  message: { text: string, type: string } | null = null;
  department: string | null = null;
  constructor(private statsService: StatsService, private authService: AuthService) { }

  ngOnInit(): void {
    this.loadDashboard();
    this.department = this.authService.getUserInfo('department');
  }

  loadDashboard(): void {
    this.statsService.getStats().subscribe({
      next: (data) => {
        this.stats = {
          ...data,
          recentFeedbacks: data.recentFeedbacks.filter(f => f.targetDepartment === this.department)
        };

        this.updateStatsData(data);
      },
      error: (error) => {
        this.showMessage(`Erro ao carregar dashboard: ${error.message}`, 'error');
      }
    });
  }

  updateStatsData(data: Stats): void {
    this.statsData = [
      {
        label: 'Notícias',
        count: data.newsCount,
        icon: 'fas fa-newspaper',
        bgClass: 'bg-soft-primary text-primary'
      },
      {
        label: 'Documentos',
        count: data.documentsCount,
        icon: 'fas fa-file-alt',
        bgClass: 'bg-soft-success text-success'
      },
      {
        label: 'Aniversariantes',
        count: data.birthdaysCount,
        icon: 'fas fa-birthday-cake',
        bgClass: 'bg-soft-pink text-pink'
      },
      {
        label: 'Usuários',
        count: data.usersCount,
        icon: 'fas fa-users',
        bgClass: 'bg-soft-purple text-purple'
      }
    ];
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
