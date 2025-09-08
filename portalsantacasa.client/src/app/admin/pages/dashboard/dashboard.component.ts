import { Component, Input, OnInit } from '@angular/core';
import { StatsService } from '../../../services/stats.service';
import { Stats } from '../../../models/stats.model';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

interface Metric {
  label: string;
  value: string;
  icon: string;
  color: string;
  trend: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

interface Event {
  title: string;
  date: Date;
  time: string;
  location: string;
}

interface Birthday {
  name: string;
  department: string;
  photoUrl?: string;
}

interface Activity {
  text: string;
  time: Date;
  icon: string;
  color: string;
}

interface Banner {
  title: string;
  description: string;
  imageUrl: string;
  category?: string;
  date: Date;
  author: string;
  newsId?: number;
}


@Component({
  selector: 'app-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  @Input() sidebarCollapsed = false;

  // Dados do usuário
  userName = 'João Silva';
  currentDate = new Date();
  temperature = 24;
  weatherDescription = 'Ensolarado';

  // Carousel
  currentSlide = 0;
  carouselInterval: any;

  // Quick Menu
  showQuickMenu = false;

  // Modal de feedback (mantido do original)
  showFeedback = false;
  feedback = {
    name: '',
    department: '',
    category: '',
    targetDepartment: '',
    subject: '',
    message: ''
  };
  departments = ['TI', 'RH', 'Financeiro', 'Marketing', 'Vendas', 'Operações'];

  // Métricas do dashboard
  metrics: Metric[] = [
    {
      label: 'Colaboradores Online',
      value: '47',
      icon: 'fas fa-users',
      color: '#10b981',
      trend: 12
    },
    {
      label: 'Notícias Publicadas',
      value: '23',
      icon: 'fas fa-newspaper',
      color: '#1a8dc3',
      trend: 8
    },
    {
      label: 'Eventos Este Mês',
      value: '12',
      icon: 'fas fa-calendar-alt',
      color: '#f59e0b',
      trend: -5
    },
    {
      label: 'Feedbacks Recebidos',
      value: '156',
      icon: 'fas fa-comments',
      color: '#8b5cf6',
      trend: 23
    }
  ];

  // Ações rápidas
  quickActions: QuickAction[] = [
    {
      id: 'feedback',
      title: 'Enviar Feedback',
      description: 'Compartilhe sua opinião conosco',
      icon: 'fas fa-comments',
      color: '#1a8dc3'
    },
    {
      id: 'menu',
      title: 'Ver Cardápio',
      description: 'Confira o cardápio da semana',
      icon: 'fas fa-utensils',
      color: '#10b981'
    },
    {
      id: 'events',
      title: 'Próximos Eventos',
      description: 'Veja os eventos programados',
      icon: 'fas fa-calendar-alt',
      color: '#f59e0b'
    },
    {
      id: 'birthdays',
      title: 'Aniversariantes',
      description: 'Parabenize os aniversariantes',
      icon: 'fas fa-birthday-cake',
      color: '#ef4444'
    },
    {
      id: 'documents',
      title: 'Documentos',
      description: 'Acesse documentos importantes',
      icon: 'fas fa-file-alt',
      color: '#6b7280'
    },
    {
      id: 'support',
      title: 'Suporte TI',
      description: 'Solicite ajuda técnica',
      icon: 'fas fa-laptop-code',
      color: '#8b5cf6'
    }
  ];

  // Banners/Notícias
  banners: Banner[] = [
    {
      title: 'Nova Política de Home Office',
      description: 'Confira as novas diretrizes para trabalho remoto e híbrido implementadas pela empresa.',
      imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=400&fit=crop',
      category: 'Políticas',
      date: new Date(2024, 0, 15),
      author: 'RH Corporativo'
    },
    {
      title: 'Evento de Integração 2024',
      description: 'Participe do nosso evento anual de integração. Inscrições abertas até o final do mês.',
      imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&h=400&fit=crop',
      category: 'Eventos',
      date: new Date(2024, 0, 12),
      author: 'Eventos Corporativos'
    },
    {
      title: 'Resultados do Trimestre',
      description: 'Excelentes resultados alcançados no último trimestre. Parabéns a toda equipe!',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop',
      category: 'Resultados',
      date: new Date(2024, 0, 10),
      author: 'Diretoria'
    }
  ];

  // Próximos eventos
  upcomingEvents: Event[] = [
    {
      title: 'Reunião Geral',
      date: new Date(2024, 0, 20),
      time: '14:00',
      location: 'Auditório Principal'
    },
    {
      title: 'Treinamento de Segurança',
      date: new Date(2024, 0, 22),
      time: '09:00',
      location: 'Sala de Treinamento'
    },
    {
      title: 'Happy Hour',
      date: new Date(2024, 0, 25),
      time: '18:00',
      location: 'Terraço'
    }
  ];

  // Aniversariantes de hoje
  todayBirthdays: Birthday[] = [
    {
      name: 'Maria Santos',
      department: 'Marketing',
      photoUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face'
    },
    {
      name: 'Carlos Silva',
      department: 'TI'
    },
    {
      name: 'Ana Costa',
      department: 'RH',
      photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
    }
  ];

  // Atividades recentes
  recentActivities: Activity[] = [
    {
      text: 'Nova notícia publicada: "Política de Home Office"',
      time: new Date(Date.now() - 30 * 60 * 1000),
      icon: 'fas fa-newspaper',
      color: '#1a8dc3'
    },
    {
      text: 'João Silva enviou um feedback',
      time: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: 'fas fa-comments',
      color: '#10b981'
    },
    {
      text: 'Evento "Reunião Geral" foi agendado',
      time: new Date(Date.now() - 4 * 60 * 60 * 1000),
      icon: 'fas fa-calendar-plus',
      color: '#f59e0b'
    },
    {
      text: 'Cardápio da semana foi atualizado',
      time: new Date(Date.now() - 6 * 60 * 60 * 1000),
      icon: 'fas fa-utensils',
      color: '#ef4444'
    }
  ];

  // Menu FAB
  fabMenuItems = [
    {
      id: 'feedback',
      label: 'Feedback',
      icon: 'fas fa-comments',
      color: '#1a8dc3'
    },
    {
      id: 'event',
      label: 'Novo Evento',
      icon: 'fas fa-calendar-plus',
      color: '#10b981'
    },
    {
      id: 'news',
      label: 'Publicar Notícia',
      icon: 'fas fa-newspaper',
      color: '#f59e0b'
    }
  ];

  // Propriedade para Math
  Math = Math;

  constructor(
    private router: Router,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.startCarousel();
  }

  ngOnDestroy(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  // ===== CAROUSEL =====
  startCarousel(): void {
    this.carouselInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.banners.length;
  }

  previousSlide(): void {
    this.currentSlide = this.currentSlide === 0 ? this.banners.length - 1 : this.currentSlide - 1;
  }

  goToSlide(index: number): void {
    this.currentSlide = index;
  }

  // ===== NAVIGATION =====
  navigateToNews(): void {
    this.toastr.info('Navegando para notícias...');
  }

  navigateToEvents(): void {
    this.toastr.info('Navegando para eventos...');
  }

  // ===== QUICK ACTIONS =====
  executeQuickAction(actionId: string): void {
    switch (actionId) {
      case 'feedback':
        this.openFeedbackModal();
        break;
      case 'menu':
        this.toastr.info('Navegando para cardápio...');
        break;
      case 'events':
        this.navigateToEvents();
        break;
      case 'birthdays':
        this.toastr.info('Navegando para aniversariantes...');
        break;
      case 'documents':
        this.toastr.info('Navegando para documentos...');
        break;
      case 'support':
        this.toastr.info('Navegando para suporte TI...');
        break;
      default:
        this.toastr.info('Funcionalidade em desenvolvimento');
    }
  }

  // ===== FAB MENU =====
  openQuickMenu(): void {
    this.showQuickMenu = true;
  }

  closeQuickMenu(): void {
    this.showQuickMenu = false;
  }

  executeFabAction(actionId: string): void {
    this.closeQuickMenu();

    switch (actionId) {
      case 'feedback':
        this.openFeedbackModal();
        break;
      case 'event':
        this.toastr.info('Criando novo evento...');
        break;
      case 'news':
        this.toastr.info('Publicando notícia...');
        break;
      default:
        this.toastr.info('Funcionalidade em desenvolvimento');
    }
  }

  // ===== FEEDBACK MODAL (mantido do original) =====
  openFeedbackModal(): void {
    this.showFeedback = true;
  }

  closeFeedbackModal(): void {
    this.showFeedback = false;
    this.resetFeedbackForm();
  }

  sendFeedback(): void {
    // Validação básica
    if (!this.feedback.name || !this.feedback.department || !this.feedback.category ||
      !this.feedback.targetDepartment || !this.feedback.subject || !this.feedback.message) {
      this.toastr.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Simula envio do feedback
    this.toastr.success('Feedback enviado com sucesso!');
    this.closeFeedbackModal();

    // Adiciona atividade recente
    this.recentActivities.unshift({
      text: `${this.feedback.name} enviou um feedback: "${this.feedback.subject}"`,
      time: new Date(),
      icon: 'fas fa-comments',
      color: '#10b981'
    });
  }

  private resetFeedbackForm(): void {
    this.feedback = {
      name: '',
      department: '',
      category: '',
      targetDepartment: '',
      subject: '',
      message: ''
    };
  }

}
