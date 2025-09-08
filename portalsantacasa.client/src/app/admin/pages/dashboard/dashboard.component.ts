import { Component, OnInit } from '@angular/core';
import { StatsService } from '../../../services/stats.service';
import { Stats } from '../../../models/stats.model';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';

interface StatsData {
  label: string;
  count: number;
  icon: string;
  bgClass: string;
  trend?: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  color: string;
  route: string;
}

interface Activity {
  text: string;
  time: Date;
  icon: string;
  color: string;
}

interface SystemStatus {
  name: string;
  description: string;
  status: 'online' | 'warning' | 'offline';
}

interface Feedback {
  message: string;
  category: string;
  createdAt: Date;
}

@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  stats: Stats | null = null;
  currentDate = new Date();
  temperature = 25;
  weatherDescription = 'Ensolarado';

  // Stats Cards
  statsData: StatsData[] = [
    {
      label: 'Total de Notícias',
      count: 45,
      icon: 'fas fa-newspaper',
      bgClass: 'bg-primary',
      trend: 12
    },
    {
      label: 'Eventos Ativos',
      count: 8,
      icon: 'fas fa-calendar-alt',
      bgClass: 'bg-success',
      trend: 5
    },
    {
      label: 'Usuários Cadastrados',
      count: 234,
      icon: 'fas fa-users',
      bgClass: 'bg-warning',
      trend: 8
    },
    {
      label: 'Feedbacks Recebidos',
      count: 67,
      icon: 'fas fa-comments',
      bgClass: 'bg-info',
      trend: 15
    }
  ];

  // Quick Actions
  quickActions: QuickAction[] = [
    {
      title: 'Nova Notícia',
      description: 'Criar e publicar uma nova notícia',
      icon: 'fas fa-plus-circle',
      color: '#667eea',
      route: '/admin/news'
    },
    {
      title: 'Novo Evento',
      description: 'Cadastrar um novo evento',
      icon: 'fas fa-calendar-plus',
      color: '#10b981',
      route: '/admin/events'
    },
    {
      title: 'Gerenciar Usuários',
      description: 'Visualizar e gerenciar usuários',
      icon: 'fas fa-user-cog',
      color: '#f59e0b',
      route: '/admin/users'
    },
    {
      title: 'Upload de Documento',
      description: 'Fazer upload de novos documentos',
      icon: 'fas fa-file-upload',
      color: '#8b5cf6',
      route: '/admin/documents'
    }
  ];

  // Recent Activities
  recentActivities: Activity[] = [
    {
      text: 'Nova notícia "Comunicado Importante" foi publicada',
      time: new Date(Date.now() - 30 * 60 * 1000),
      icon: 'fas fa-newspaper',
      color: '#667eea'
    },
    {
      text: 'Usuário João Silva foi cadastrado no sistema',
      time: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: 'fas fa-user-plus',
      color: '#10b981'
    },
    {
      text: 'Evento "Reunião Mensal" foi atualizado',
      time: new Date(Date.now() - 4 * 60 * 60 * 1000),
      icon: 'fas fa-calendar-edit',
      color: '#f59e0b'
    },
    {
      text: 'Novo feedback foi recebido no sistema',
      time: new Date(Date.now() - 6 * 60 * 60 * 1000),
      icon: 'fas fa-comment',
      color: '#8b5cf6'
    }
  ];

  // System Status
  systemStatus: SystemStatus[] = [
    {
      name: 'Servidor Web',
      description: 'Funcionando normalmente',
      status: 'online'
    },
    {
      name: 'Banco de Dados',
      description: 'Conexão estável',
      status: 'online'
    },
    {
      name: 'Sistema de Email',
      description: 'Processando fila',
      status: 'warning'
    },
    {
      name: 'Backup Automático',
      description: 'Último backup: 2h atrás',
      status: 'online'
    }
  ];

  // Recent Feedbacks
  recentFeedbacks: Feedback[] = [
    {
      message: 'Excelente iniciativa com o novo sistema de intranet. Muito mais fácil de usar!',
      category: 'Elogio',
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
    },
    {
      message: 'Seria interessante ter notificações push para os eventos importantes.',
      category: 'Sugestão',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
    },
    {
      message: 'O cardápio da semana não está sendo atualizado regularmente.',
      category: 'Reclamação',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
    }
  ];

  // Quick Stats
  onlineUsers = 47;
  publishedNews = 45;
  activeEvents = 8;
  totalDocuments = 156;

  constructor(private router: Router) { }

  ngOnInit(): void {
    // Inicialização do dashboard
    this.loadDashboardData();
  }

  executeQuickAction(route: string): void {
    this.router.navigate([route]);
  }

  navigateToFeedbacks(): void {
    this.router.navigate(['/admin/feedbacks']);
  }

  private loadDashboardData(): void {
    // Aqui você carregaria os dados reais do backend
    // Por enquanto usando dados mockados
    console.log('Dashboard data loaded');
  }

}
