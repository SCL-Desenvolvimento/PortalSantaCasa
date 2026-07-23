import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NewsService } from '../../core/services/news.service';
import { environment } from '../../../environments/environment';
import { News } from '../../models/news.model';
import { PointsService } from '../../core/services/points.service';
import { PublicAccessLogService } from '../../core/services/public-access-log.service';

@Component({
  selector: 'app-news-detail',
  standalone: false,
  templateUrl: './news-detail.component.html',
  styleUrls: ['./news-detail.component.css']
})
export class NewsDetailComponent implements OnInit {
  news: News = { title: '', summary: '', content: '', isActive: true, createdAt: '', imageUrl: '', isQualityMinute: false, category: '' };
  relatedNews: News[] = [];
  isLoading = true;
  hasError = false;
  isQualityMinute: boolean = false;
  isVertical: boolean = false; // Variável de controle de layout
  isAccessLogModalOpen = false;
  private accessRegisteredForId?: number;

  constructor(
    private newsService: NewsService,
    private pointsService: PointsService,
    private publicAccessLogService: PublicAccessLogService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      const newsId = paramMap.get('id');
      if (newsId) {
        this.accessRegisteredForId = undefined;
        this.isAccessLogModalOpen = false;
        this.fetchNews(Number(newsId));
      } else {
        this.isLoading = false;
        this.hasError = true;
      }
    });
  }

  // Detecta se a imagem é alta (vertical) ou larga (horizontal)
  checkOrientation(event: Event) {
    const img = event.target as HTMLImageElement;
    this.isVertical = img.naturalHeight > img.naturalWidth;
  }

  fetchNews(id: number) {
    this.newsService.getNewsById(id).subscribe({
      next: (data) => {
        this.news = {
          ...data,
          imageUrl: data.imageUrl ? `${environment.serverUrl}${data.imageUrl}` : '',
          content: this.cleanHtmlContent(data.content)
        };
        this.isQualityMinute = this.news.isQualityMinute;
        this.fetchRelatedNews(id);
        this.isLoading = false;

        this.handleContentAccess();
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  fetchRelatedNews(currentId: number) {
    this.newsService.getNewsPaginated().subscribe({
      next: (data) => {
        this.relatedNews = data.news
          .filter(n => n.isQualityMinute === this.isQualityMinute)
          .map(news => ({
            ...news,
            imageUrl: news.imageUrl ? `${environment.serverUrl}${news.imageUrl}` : ''
          }))
          .filter((news: any) => news.id !== currentId)
          .slice(0, 3);
      }
    });
  }

  voltar() {
    this.isQualityMinute
      ? this.router.navigate(['/noticias'], { queryParams: { isQualityMinute: true } })
      : this.router.navigate(['/noticias']);
  }

  onAccessLogRegistered(): void {
    this.isAccessLogModalOpen = false;
    this.registerViewPoints();
    this.accessRegisteredForId = this.news.id;
  }

  onAccessLogClosed(): void {
    this.isAccessLogModalOpen = false;
    this.voltar();
  }

  get accessLogPage(): string {
    return this.isQualityMinute ? 'Qualidade' : 'Notícias';
  }

  navigateToNews(id: number | undefined) { this.router.navigate(['/noticia', id]); }

  shareNews() {
    if (navigator.share) {
      navigator.share({
        title: this.news.title,
        text: this.news.summary,
        url: window.location.href
      }).catch(() => undefined);
      return;
    }

    navigator.clipboard.writeText(window.location.href)
      .then(() => alert('Link copiado para a área de transferência.'));
  }

  printNews() { window.print(); }

  trackByNewsId(index: number, news: News): number | string {
    return news.id ?? `${news.title}-${index}`;
  }

  private cleanHtmlContent(content: string | undefined): string {
    if (!content) return '';
    return content.replace(/&nbsp;/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/<p><\/p>/g, '').trim();
  }

  private registerViewPoints(): void {
    if (!this.news?.id || !this.news.title?.trim()) {
      return;
    }

    this.pointsService.registerFromSavedIdentity({
      eventType: this.isQualityMinute ? 'QUALITY_VIEW' : 'NEWS_VIEW',
      referenceId: String(this.news.id),
      referenceTitle: this.news.title
    }).subscribe();
  }

  private handleContentAccess(): void {
    if (!this.news?.id || this.accessRegisteredForId === this.news.id) {
      return;
    }

    const identity = this.pointsService.getSavedIdentity();

    if (!identity) {
      this.isAccessLogModalOpen = true;
      return;
    }

    this.publicAccessLogService.create({
      name: identity.name,
      re: identity.re,
      sector: identity.sector,
      page: this.accessLogPage,
      contentId: this.news.id,
      contentTitle: this.news.title
    }).subscribe({
      next: () => {
        this.accessRegisteredForId = this.news.id;
      },
      error: (error) => {
        console.warn('Nao foi possivel registrar acesso publico.', error.message || error);
      }
    });

    this.registerViewPoints();
  }
}
