import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { StatsService } from '../../../core/services/stats.service';
import { EventService } from '../../../core/services/event.service';
import { BirthdayService } from '../../../core/services/birthday.service';
import { NewsService } from '../../../core/services/news.service';
import { Stats } from '../../../models/stats.model';
import { Event } from '../../../models/event.model';
import { Birthday } from '../../../models/birthday.model';
import { News } from '../../../models/news.model';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { WeatherService } from '../../../core/services/weather.service';
import { FeedbackService } from '../../../core/services/feedbacks.service';

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

interface Activity {
  text: string;
  time: Date;
  icon: string;
  color: string;
}

interface DashboardEvent {
  title: string;
  date: Date;
  time: string;
  location: string;
}

interface DashboardBirthday {
  name: string;
  department: string;
  photoUrl?: string;
}

interface DashboardNews {
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
export class DashboardComponent implements OnInit, OnDestroy {
  @Input() sidebarCollapsed = false;

  private destroy$ = new Subject<void>();

  // Loading states
  isLoadingStats = true;
  isLoadingBanners = true;
  isLoadingEvents = true;
  isLoadingBirthdays = true;

  // Dados do usuário
  userName = '';
  currentDate = new Date();
  temperature = 0;
  weatherDescription = 'Carregando...';
  weatherIcon = 'fas fa-cloud';

  // Carousel
  currentSlide = 0;
  carouselInterval: any;

  // Quick Menu
  showQuickMenu = false;

  // Métricas do dashboard - serão carregadas do serviço
  metrics: Metric[] = [];

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

  // Notícias - serão carregados do serviço
  news: DashboardNews[] = [];

  // Próximos eventos - serão carregados do serviço
  upcomingEvents: DashboardEvent[] = [];

  // Aniversariantes de hoje - serão carregados do serviço
  todayBirthdays: DashboardBirthday[] = [];

  // Atividades recentes - mantidas como estão por enquanto
  recentActivities: Activity[] = [];

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

  greeting = '';

  constructor(
    private router: Router,
    private toastr: ToastrService,
    private statsService: StatsService,
    private eventService: EventService,
    private birthdayService: BirthdayService,
    private newsService: NewsService,
    private authService: AuthService,
    private weatherService: WeatherService,
    private feedbackService: FeedbackService
  ) { }

  ngOnInit(): void {
    this.userName = this.authService.getUserInfo('username') || 'Usuário';
    this.setGreeting();
    this.loadWeather();
    this.loadDashboardData();
    this.startCarousel();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  private setGreeting(): void {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      this.greeting = 'Bom dia';
    } else if (hour >= 12 && hour < 18) {
      this.greeting = 'Boa tarde';
    } else {
      this.greeting = 'Boa noite';
    }
  }

  private loadWeather(): void {
    // latitude e longitude de São Paulo
    const lat = -23.55052;
    const lon = -46.633308;

    this.weatherService.getWeather(lat, lon).subscribe({
      next: (data) => {
        if (data.current_weather) {
          this.temperature = Math.round(data.current_weather.temperature);
          const wind = data.current_weather.windspeed;
          this.weatherDescription = `Vento ${wind} km/h`;
          this.setWeatherIcon();
        }
      },
      error: () => {
        this.weatherDescription = 'Não disponível';
        this.temperature = 0;
        this.weatherIcon = 'fas fa-exclamation-triangle';
      }
    });
  }

  private setWeatherIcon(): void {
    if (this.temperature >= 25) {
      this.weatherIcon = 'fas fa-sun';
    } else if (this.temperature >= 18) {
      this.weatherIcon = 'fas fa-cloud-sun';
    } else if (this.temperature >= 10) {
      this.weatherIcon = 'fas fa-cloud';
    } else if (this.temperature < 10) {
      this.weatherIcon = 'fas fa-snowflake';
    } else {
      this.weatherIcon = 'fas fa-smog';
    }
  }

  // ===== CARREGAMENTO DE DADOS =====
  loadDashboardData(): void {
    // Carrega todos os dados em paralelo
    forkJoin({
      stats: this.statsService.getStats(),
      news: this.newsService.getNews(),
      events: this.eventService.getEvent(),
      birthdays: this.birthdayService.getBirthdays()
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.processStatsData(data.stats);
        this.processNewsData(data.news);
        this.processEventsData(data.events);
        this.processBirthdaysData(data.birthdays);

        this.isLoadingStats = false;
        this.isLoadingBanners = false;
        this.isLoadingEvents = false;
        this.isLoadingBirthdays = false;
      },
      error: (error) => {
        console.error('Erro ao carregar dados do dashboard:', error);
        this.toastr.error('Erro ao carregar dados do dashboard');
        // Não carrega dados de fallback, deixa os arrays vazios
      }
    });
  }

  private processStatsData(stats: Stats): void {
    this.metrics = [
      {
        label: 'Colaboradores Online',
        value: stats.usersCount?.toString() || '0',
        icon: 'fas fa-users',
        color: '#10b981',
        trend: 12 // Você pode calcular a tendência baseada em dados históricos
      },
      {
        label: 'Notícias Publicadas',
        value: stats.newsCount?.toString() || '0',
        icon: 'fas fa-newspaper',
        color: '#1a8dc3',
        trend: 8
      },
      {
        label: 'Documentos',
        value: stats.documentsCount?.toString() || '0',
        icon: 'fas fa-file-alt',
        color: '#f59e0b',
        trend: -5
      },
      {
        label: 'Aniversariantes',
        value: stats.birthdaysCount?.toString() || '0',
        icon: 'fas fa-birthday-cake',
        color: '#8b5cf6',
        trend: 23
      }
    ];
  }

  private processNewsData(news: News[]): void {
    this.news = news
      .filter(news => news.isActive)
      .map(news => ({
        title: news.title,
        description: news.summary,
        imageUrl: `${environment.serverUrl}${news.imageUrl}`,
        category: 'Notícias',
        date: new Date(),
        author: 'Sistema',
        newsId: news.id
      }));
  }

  private processEventsData(events: Event[]): void {
    const today = new Date();
    this.upcomingEvents = events
      .filter(event => event.isActive && new Date(event.eventDate) >= today)
      .slice(0, 3) // Mostra apenas os próximos 3 eventos
      .map(event => {
        const eventDate = new Date(event.eventDate);
        return {
          title: event.title,
          date: eventDate,
          time: eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          location: event.location
        };
      });
  }

  private processBirthdaysData(birthdays: Birthday[]): void {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];

    this.todayBirthdays = birthdays
      .filter(birthday => {
        if (!birthday.isActive) return false;

        // Verifica se é aniversário hoje (comparando mês e dia)
        const birthDate = new Date(birthday.birthDate);
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();
        const birthMonth = birthDate.getMonth();
        const birthDay = birthDate.getDate();

        return todayMonth === birthMonth && todayDay === birthDay;
      })
      .map(birthday => ({
        name: birthday.name,
        department: birthday.department || 'Não informado',
        photoUrl: birthday.photoUrl
      }));
  }

  // ===== CAROUSEL =====
  startCarousel(): void {
    this.carouselInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  nextSlide(): void {
    this.currentSlide = (this.currentSlide + 1) % this.news.length;
  }

  previousSlide(): void {
    this.currentSlide = this.currentSlide === 0 ? this.news.length - 1 : this.currentSlide - 1;
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

  // ===== FEEDBACK =====
  openFeedbackModal(): void {
    this.feedbackService.open();
  }
}

