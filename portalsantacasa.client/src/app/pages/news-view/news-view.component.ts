import { Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map, Subscription } from 'rxjs';
import { News } from '../../models/news.model';
import { NewsService } from '../../core/services/news.service';
import { environment } from '../../../environments/environment';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-news-view',
  standalone: false,
  templateUrl: './news-view.component.html',
  styleUrl: './news-view.component.css'
})
export class NewsViewComponent {
  newsList: News[] = [];
  mainNews?: News;
  isQualityMinute: boolean = false;

  currentPage = 1;
  perPage = 10;
  totalPages = 0;

  isLoading = true;
  hasError = false;
  selectedImageUrl: string | null = null;
  selectedImageAlt = '';
  private newsSubscription?: Subscription;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private newsService: NewsService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.queryParams.pipe(
      map(params => params['isQualityMinute'] === 'true'),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(isQualityMinute => {
      this.isQualityMinute = isQualityMinute;
      this.currentPage = 1;
      this.totalPages = 0;
      this.closeImage();
      this.loadNews(1);
    });
  }

  loadNews(page: number): void {
    if (page < 1 || (this.totalPages > 0 && page > this.totalPages)) {
      return;
    }

    this.newsSubscription?.unsubscribe();
    this.currentPage = page;
    this.isLoading = true;
    this.hasError = false;

    this.newsSubscription = this.newsService.getNewsPaginated(page, this.perPage, this.isQualityMinute)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        if (Array.isArray(data.news) && data.news.length) {
          const formattedNews = data.news.map(news => ({
            ...news,
            imageUrl: this.formatImageUrl(news.imageUrl)
          }));

          this.mainNews = formattedNews[0];
          this.newsList = formattedNews.slice(1);

          this.totalPages = data.pages;
          this.currentPage = data.currentPage;
        } else {
          this.mainNews = undefined;
          this.newsList = [];
          this.totalPages = data.pages || 0;
          this.currentPage = data.currentPage || page;
        }
        this.isLoading = false;
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  get paginationPages(): number[] {
    if (this.totalPages <= 5) {
      return Array.from({ length: this.totalPages }, (_, index) => index + 1);
    }

    const start = Math.min(
      Math.max(this.currentPage - 2, 1),
      this.totalPages - 4
    );

    return Array.from({ length: 5 }, (_, index) => start + index);
  }

  trackByNewsId(index: number, news: News): number | string {
    return news.id ?? `${news.title}-${index}`;
  }

  openImage(event: Event, imageUrl: string, imageAlt: string): void {
    if (!imageUrl) return;

    event.preventDefault();
    event.stopPropagation();
    this.selectedImageUrl = imageUrl;
    this.selectedImageAlt = imageAlt || 'Imagem da publicação';
  }

  closeImage(): void {
    this.selectedImageUrl = null;
    this.selectedImageAlt = '';
  }

  @HostListener('document:keydown.escape')
  closeImageOnEscape(): void {
    if (this.selectedImageUrl) this.closeImage();
  }

  private formatImageUrl(imagePath: string): string {
    if (!imagePath) {
      return '';
    }

    return `${environment.serverUrl}${imagePath}`;
  }
}
