import { Component } from '@angular/core';
import { News } from '../../models/news.model';
import { NewsService } from '../../services/news.service';
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

  // novos estados
  isLoading = true;
  hasError = false;

  constructor(
    private newsService: NewsService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.isQualityMinute = params['isQualityMinute'] === 'true';
      this.loadNews(this.currentPage);
    });
  }

  loadNews(page: number): void {
    this.isLoading = true;
    this.hasError = false;

    this.newsService.getNewsPaginated(page, this.perPage, this.isQualityMinute).subscribe({
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
        }
        this.isLoading = false;
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  private formatImageUrl(imagePath: string): string {
    return `${environment.imageServerUrl}${imagePath}`;
  }
}
