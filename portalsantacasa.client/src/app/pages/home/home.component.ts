import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Router } from '@angular/router';
import { FeedbackService } from '../../services/feedbacks.service';
import { Feedback } from '../../models/feedback.model';
import { BirthdayService } from '../../services/birthday.service';
import { MenuService } from '../../services/menu.service';
import { EventService } from '../../services/event.service';
import { Birthday } from '../../models/birthday.model';
import { Menu } from '../../models/menu.model';
import { Event } from '../../models/event.model';
import { environment } from '../../../environments/environment';
import { Banner } from '../../models/banner.model';
import { BannerService } from '../../services/banner.service';

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  date: Date;
  author: string;
}

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  @Input() activeSection: string = 'home';

  // Estados do componente
  showFeedback = false;
  selected: string | null = null;

  // Banner Carousel
  banners: Banner[] = [];
  currentSlide = 0;
  progress = 0;
  intervalId: any;
  progressInterval: any;

  // News Carousel
  currentNewsSlide = 0;
  newsAutoSlideInterval: any;

  // Dados
  birthdays: Birthday[] = [];
  todayBirthdays: Birthday[] = [];
  menuItems: Menu[] = [];
  weeklyMenu: Menu[] = [];
  events: Event[] = [];
  upcomingEvents: Event[] = [];
  latestNews: NewsItem[] = [];

  // Feedback
  feedback: Feedback = this.resetFeedbackModal();

  // Departamentos
  departments: string[] = [
    "Almoxarifado", "Ambulatório Convênio", "Ambulatório de Oncologia", "Ambulatório SUS",
    "Auditoria Enfermagem", "Cadastro", "Capela", "Cardiologia", "C.A.S.", "Casa de Força",
    "Centro Cirúrgico", "Clínica Cirúrgica", "Clínica Emília", "Clínica Médica", "C.M.E.",
    "Compras", "Contabilidade", "Custo Hospitalar", "Emergência PS", "Endoscopia",
    "Engenharia Clínica", "Exames Análises Clínicas", "Exames de Anatomia Patológica",
    "Expansão / Obras", "Farmácia", "Faturamento", "Financeiro", "Fisioterapia",
    "Gerador de Energia", "Gerência Comercial", "Gerência de Processos", "Gerência de Enfermagem",
    "HC Especialidades", "Hemodinâmica", "Hotelaria", "Informática", "Jurídico", "Lactário",
    "Lavanderia", "Manutenção", "Maternidade SUS", "Necrotério", "NIR - Núcleo Interno de Regulação",
    "Ortopedia", "Patrimônio", "Pediatria", "Pesquisa e Desenvolvimento", "Portarias",
    "Pronto Atendimento", "Pronto Socorro Adulto", "Pronto Socorro Infantil", "Provedoria",
    "Qualidade", "Raio-X", "Reforma de Ambulatório", "Relacionamento Externo",
    "Recursos Humanos (RH)", "Sala de Videoconferência", "SAME SPP", "SCIH", "Secretaria",
    "Serviço de Imagem", "Serviço de Hemoterapia", "Serviço Profissional", "Serviço Social",
    "Serviços de Psicologia", "SESMT", "Setor de Autorização", "Setor de Recursos e Glosas",
    "SND - Serviço de Nutrição e Dietética", "Superintendência", "Suprimentos", "Telefonia",
    "Transporte", "Usina de Oxigênio", "UTI Geral", "UTI Neonatal", "UTI 01", "UTI 02", "Zeladoria"
  ];

  departmentsTarget: string[] = ["Informática"];

  constructor(
    private router: Router,
    private feedbackService: FeedbackService,
    private birthDayService: BirthdayService,
    private menuService: MenuService,
    private eventService: EventService,
    private bannerService: BannerService
  ) { }

  ngOnInit(): void {
    this.loadAllData();
    this.generateMockNews();
    this.startNewsAutoSlide();
  }

  ngOnDestroy(): void {
    this.clearIntervals();
    this.clearNewsInterval();
  }

  // ===== DATA LOADING =====
  loadAllData(): void {
    this.loadBanners();
    this.loadBirthdays();
    this.loadMenu();
    this.loadEvents();
  }

  loadBanners(): void {
    this.bannerService.getBanners().subscribe({
      next: (data) => {
        this.banners = data.map(banner => ({
          ...banner,
          imageUrl: `${environment.imageServerUrl}${banner.imageUrl}`
        }));
        this.startCarousel();
      },
      error: (err) => {
        console.error('Erro ao buscar banners', err);
      }
    });
  }

  loadBirthdays(): void {
    this.birthDayService.getNextBirthdays().subscribe({
      next: (data) => {
        this.birthdays = data.map(birthday => ({
          ...birthday,
          photoUrl: `${environment.imageServerUrl}${birthday.photoUrl}` 
        }));

        // Filtrar aniversariantes de hoje
        const today = new Date();
        this.todayBirthdays = this.birthdays.filter(birthday => {
          const birthDate = new Date(birthday.birthDate);
          return birthDate.getDate() === today.getDate() &&
            birthDate.getMonth() === today.getMonth();
        }).slice(0, 3); // Máximo 3 para o widget
      },
      error: (err) => {
        console.error('Erro ao buscar aniversariantes', err);
      }
    });
  }

  loadMenu(): void {
    this.menuService.getMenu().subscribe({
      next: (data) => {
        this.menuItems = data.map(menu => ({
          ...menu,
          imagemUrl:  `${environment.imageServerUrl}${menu.imagemUrl}`
        }));

        // Pegar apenas os próximos dias para o widget
        this.weeklyMenu = this.menuItems.slice(0, 3);
      },
      error: (err) => {
        console.error('Erro ao buscar cardápio', err);
      }
    });
  }

  loadEvents(): void {
    this.eventService.getNextBirthdays().subscribe({
      next: (data) => {
        this.events = data;

        // Filtrar próximos eventos para o widget
        const now = new Date();
        this.upcomingEvents = this.events
          .filter(event => new Date(event.eventDate) > now)
          .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
          .slice(0, 3);
      },
      error: (err) => {
        console.error('Erro ao buscar eventos', err);
      }
    });
  }

  generateMockNews(): void {
    this.latestNews = [
      {
        id: '1',
        title: 'Nova Política de Home Office',
        excerpt: 'Confira as novas diretrizes para trabalho remoto implementadas pela empresa.',
        imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=250&fit=crop',
        category: 'Políticas',
        date: new Date(2024, 0, 15),
        author: 'RH Corporativo'
      },
      {
        id: '2',
        title: 'Evento de Integração 2024',
        excerpt: 'Participe do nosso evento anual de integração. Inscrições abertas.',
        imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=250&fit=crop',
        category: 'Eventos',
        date: new Date(2024, 0, 12),
        author: 'Eventos Corporativos'
      },
      {
        id: '3',
        title: 'Resultados do Trimestre',
        excerpt: 'Excelentes resultados alcançados no último trimestre.',
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop',
        category: 'Resultados',
        date: new Date(2024, 0, 10),
        author: 'Diretoria'
      },
      {
        id: '4',
        title: 'Programa de Capacitação',
        excerpt: 'Novos cursos de capacitação disponíveis para todos os colaboradores.',
        imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=250&fit=crop',
        category: 'Treinamento',
        date: new Date(2024, 0, 8),
        author: 'RH Corporativo'
      },
      {
        id: '5',
        title: 'Sustentabilidade Corporativa',
        excerpt: 'Iniciativas verdes implementadas em toda a organização.',
        imageUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=250&fit=crop',
        category: 'Sustentabilidade',
        date: new Date(2024, 0, 5),
        author: 'Diretoria'
      }
    ];
  }

  // ===== BANNER CAROUSEL =====
  startCarousel(): void {
    if (!this.banners.length) return;
    this.showSlide(this.currentSlide);
  }

  showSlide(index: number): void {
    this.clearIntervals();
    this.currentSlide = index;
    this.animateProgressBar();

    const duration = this.getCurrentSlideDuration();
    this.intervalId = setTimeout(() => {
      this.showSlide((index + 1) % this.banners.length);
    }, duration);
  }

  nextSlide(): void {
    this.showSlide((this.currentSlide + 1) % this.banners.length);
  }

  previousSlide(): void {
    this.showSlide(this.currentSlide === 0 ? this.banners.length - 1 : this.currentSlide - 1);
  }

  goToSlide(index: number): void {
    this.showSlide(index);
  }

  getCurrentSlideDuration(): number {
    return (this.banners[this.currentSlide]?.timeSeconds ?? 5) * 1000;
  }

  animateProgressBar(): void {
    clearTimeout(this.progressInterval);
    this.progress = 0;

    const duration = this.getCurrentSlideDuration();
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      this.progress = Math.min((elapsed / duration) * 100, 100);

      if (this.progress < 100) {
        this.progressInterval = setTimeout(updateProgress, 16);
      }
    };

    updateProgress();
  }

  clearIntervals(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
    }
    if (this.progressInterval) {
      clearTimeout(this.progressInterval);
    }
  }

  // ===== NEWS CAROUSEL =====
  startNewsAutoSlide(): void {
    this.newsAutoSlideInterval = setInterval(() => {
      this.nextNewsSlide();
    }, 8000); // 8 segundos por slide
  }

  nextNewsSlide(): void {
    if (this.currentNewsSlide < this.latestNews.length - 1) {
      this.currentNewsSlide++;
    } else {
      this.currentNewsSlide = 0;
    }
  }

  previousNewsSlide(): void {
    if (this.currentNewsSlide > 0) {
      this.currentNewsSlide--;
    } else {
      this.currentNewsSlide = this.latestNews.length - 1;
    }
  }

  goToNewsSlide(index: number): void {
    this.currentNewsSlide = index;
    this.clearNewsInterval();
    this.startNewsAutoSlide();
  }

  clearNewsInterval(): void {
    if (this.newsAutoSlideInterval) {
      clearInterval(this.newsAutoSlideInterval);
    }
  }

  // ===== NAVIGATION =====
  navegar(rota: string, queryParams?: any): void {
    this.router.navigate([`/${rota}`], { queryParams });
  }

  showBirthdays(): void {
    this.selected = 'birthdays';
  }

  showMenu(): void {
    this.selected = 'menu';
  }

  showEvents(): void {
    this.selected = 'events';
  }

  resetSelection(): void {
    this.selected = null;
  }

  // ===== FEEDBACK =====
  openFeedbackModal(): void {
    this.showFeedback = true;
  }

  closeFeedbackModal(): void {
    this.showFeedback = false;
    this.feedback = this.resetFeedbackModal();
  }

  sendFeedback(): void {
    // Validação básica
    if (!this.feedback.name || !this.feedback.department || !this.feedback.category ||
      !this.feedback.targetDepartment || !this.feedback.subject || !this.feedback.message) {
      console.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const formData = new FormData();
    formData.append('name', this.feedback.name);
    formData.append('message', this.feedback.message);
    formData.append('email', this.feedback.email || '');
    formData.append('department', this.feedback.department || '');
    formData.append('targetDepartment', this.feedback.targetDepartment || '');
    formData.append('category', this.feedback.category);
    formData.append('subject', this.feedback.subject);

    this.feedbackService.createFeedback(formData).subscribe({
      next: (data) => {
        this.closeFeedbackModal();
        console.log('Feedback enviado com sucesso!');
      },
      error: (error) => {
        console.error('Erro ao enviar feedback', error);
      }
    });
  }

  resetFeedbackModal(): Feedback {
    return {
      name: '',
      email: '',
      department: '',
      category: '',
      targetDepartment: '',
      subject: '',
      message: '',
      isRead: false,
      createdAt: ''
    };
  }
}

