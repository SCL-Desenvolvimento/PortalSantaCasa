import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Router } from '@angular/router';
import { BirthdayService } from '../../core/services/birthday.service';
import { MenuService } from '../../core/services/menu.service';
import { EventService } from '../../core/services/event.service';
import { Birthday } from '../../models/birthday.model';
import { Menu } from '../../models/menu.model';
import { News } from '../../models/news.model';
import { Event } from '../../models/event.model';
import { environment } from '../../../environments/environment';
import { Banner } from '../../models/banner.model';
import { BannerService } from '../../core/services/banner.service';
import { NewsService } from '../../core/services/news.service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {

  // Estados do componente
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
  todayBirthdaysCount: number = 0;
  menuItems: Menu[] = [];
  weeklyMenu: Menu[] = [];
  events: Event[] = [];
  upcomingEvents: Event[] = [];
  latestNews: News[] = [];

  constructor(
    private router: Router,
    private newsService: NewsService,
    private birthDayService: BirthdayService,
    private menuService: MenuService,
    private eventService: EventService,
    private bannerService: BannerService
  ) { }

  ngOnInit(): void {
    this.loadAllData();
    this.loadNews();
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
          imageUrl: `${environment.serverUrl}${banner.imageUrl}`
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
          photoUrl: `${environment.serverUrl}${birthday.photoUrl}`
        }));

        const today = new Date();
        const todayDay = today.getDate();
        const todayMonth = today.getMonth() + 1;

        const allTodayBirthdays = this.birthdays.filter(birthday => {
          // quebra a string yyyy-MM-dd
          const [year, month, day] = birthday.birthDate.split('-').map(Number);
          return day === todayDay && month === todayMonth;
        });

        this.todayBirthdaysCount = allTodayBirthdays.length;
        this.todayBirthdays = allTodayBirthdays.slice(0, 3);
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
          imagemUrl: `${environment.serverUrl}${menu.imagemUrl}`
        }));

        // Obter o nome do dia da semana atual em português
        const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
        const today = new Date();
        const todayName = diasSemana[today.getDay()];

        // Pegar apenas o menu do dia atual para o widget
        this.weeklyMenu = this.menuItems.filter(menu => menu.diaDaSemana.toLowerCase() === todayName);

        // Se quiser apenas 1 item
        if (this.weeklyMenu.length > 1) {
          this.weeklyMenu = [this.weeklyMenu[0]];
        }
      },
      error: (err) => {
        console.error('Erro ao buscar cardápio', err);
      }
    });
  }

  loadEvents(): void {
    this.eventService.getNextEvents().subscribe({
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

  loadNews(): void {
    this.newsService.getNewsPaginated(1, 5).subscribe({
      next: (data) => {
        this.latestNews = data.news.map(n => ({
          ...n,
          imageUrl: `${environment.serverUrl}${n.imageUrl}`
        }))
      },
      error: (err) => {

      }
    })
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
}

