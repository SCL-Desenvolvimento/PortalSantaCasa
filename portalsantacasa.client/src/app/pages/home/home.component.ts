import { Component, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  showFeedback = false;
  banners: Banner[] = [];
  currentSlide = 0;
  progress = 0;
  intervalId: any;
  progressInterval: any;
  feedback: Feedback = this.resetFeedbackModal();
  selected: string | null = null;
  birthdays: Birthday[] = [];
  menuItems: Menu[] = [];
  events: Event[] = [];
  cards = [
    {
      title: 'Notícias',
      description: 'Fique por dentro das últimas novidades da empresa',
      icon: 'fas fa-newspaper',
      iconColor: '#0d6efd',
      buttonText: 'Ver Notícias',
      btnClass: 'custom-bg-btn',
      action: () => this.navegar('/noticias')
    },
    {
      title: 'Documentos',
      description: 'Acesse documentos importantes e formulários',
      icon: 'fas fa-file-alt',
      iconColor: '#198754',
      buttonText: 'Ver Documentos',
      btnClass: 'custom-bg-btn',
      action: () => this.navegar('/documentos')
    },
    {
      title: 'Aniversariantes',
      description: 'Comemore com os aniversariantes do mês',
      icon: 'fas fa-birthday-cake',
      iconColor: '#d63384',
      buttonText: 'Ver Aniversariantes',
      btnClass: 'custom-bg-btn',
      action: () => this.showBirthdays()
    },
    {
      title: 'Cardápio',
      description: 'Confira o cardápio da semana',
      icon: 'fas fa-utensils',
      iconColor: '#343a40',
      buttonText: 'Ver Cardápio',
      btnClass: 'custom-bg-btn',
      action: () => this.showMenu()
    },
    {
      title: 'Eventos',
      description: 'Veja os próximos eventos e atividades',
      icon: 'fas fa-calendar-alt',
      iconColor: '#FF9800',
      buttonText: 'Ver Eventos',
      btnClass: 'custom-bg-btn',
      action: () => this.showEvents()
    },
    {
      title: 'Feedback',
      description: 'Envie suas sugestões e comentários',
      icon: 'fas fa-comments',
      iconColor: '#6610f2',
      buttonText: 'Enviar Feedback',
      btnClass: 'custom-bg-btn',
      action: () => this.openFeedbackModal()
    }
  ];

  constructor(private router: Router, private feedbackService: FeedbackService, private birthDayService: BirthdayService,
    private menuService: MenuService, private eventService: EventService, private bannerService: BannerService) { }

  ngOnInit(): void {
    this.loadBirthdays();
    this.loadMenu();
    this.loadEvents();
    this.loadBanners();
  }

  loadBanners() {
    this.bannerService.getBanners().subscribe(data => {
      this.banners = data.map(banner => ({
        ...banner,
        imageUrl: `${environment.imageServerUrl}${banner.imageUrl}`
      }))
      this.startCarousel();
    });
  }

  resetFeedbackModal() {
    return {
      name: '',
      email: '',
      department: '',
      category: '',
      subject: '',
      message: '',
      isRead: false,
      createdAt: ''
    };
  }

  loadBirthdays() {
    this.birthDayService.getNextBirthdays().subscribe({
      next: (data) => {
        this.birthdays = data.map(birthday => ({
          ...birthday, photoUrl: `${environment.imageServerUrl}${birthday.photoUrl}`
        }));
      },
      error: (err) => {
        console.error('Erro ao buscar aniversariantes', err);
      }
    });
  }

  loadMenu() {
    this.menuService.getMenu().subscribe({
      next: (data) => {
        this.menuItems = data.map(menu => ({
          ...menu, imagemUrl: `${environment.imageServerUrl}${menu.imagemUrl}`
        }));;
      },
      error: (err) => {
        console.error('Erro ao buscar cardápio', err);
      }
    });
  }

  loadEvents() {
    this.eventService.getNextBirthdays().subscribe({
      next: (data) => {
        this.events = data;
      },
      error: (err) => {
        console.error('Erro ao buscar eventos', err);
      }
    });
  }

  navegar(rota: string): void {
    this.router.navigate([`/${rota}`]);
  }

  openFeedbackModal() {
    this.showFeedback = true;
  }

  closeFeedbackModal() {
    this.showFeedback = false;
  }

  sendFeedback() {
    const formData = new FormData();
    formData.append('name', this.feedback.name);
    formData.append('message', this.feedback.message);
    formData.append('email', this.feedback.email || '');
    formData.append('department', this.feedback.department || '');
    formData.append('category', this.feedback.category);
    formData.append('subject', this.feedback.subject);

    this.feedbackService.createFeedback(formData).subscribe({
      next: (data) => {
        this.closeFeedbackModal();
      },
      error: (error) => {

      }
    })
  }

  showBirthdays() {
    this.selected = 'birthdays';
  }

  showMenu() {
    this.selected = 'menu';
  }

  showEvents() {
    this.selected = 'events';
  }

  resetSelection() {
    this.selected = null;
  }

  startCarousel() {
    if (!this.banners.length) return;
    this.showSlide(this.currentSlide);
  }

  showSlide(index: number) {
    clearTimeout(this.intervalId);
    this.currentSlide = index;
    this.animateProgressBar();

    const duration = this.getCurrentSlideDuration();
    this.intervalId = setTimeout(() => {
      this.showSlide((index + 1) % this.banners.length);
    }, duration);
  }

  getCurrentSlideDuration(): number {
    return (this.banners[this.currentSlide]?.timeSeconds ?? 5) * 1000;
  }

  animateProgressBar() {
    clearTimeout(this.progressInterval);
    this.progress = 0;

    const duration = this.getCurrentSlideDuration();
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      this.progress = Math.min((elapsed / duration) * 100, 100);

      if (this.progress < 100) {
        this.progressInterval = setTimeout(updateProgress, 16); // ~60fps
      }
    };

    updateProgress();
  }
}
