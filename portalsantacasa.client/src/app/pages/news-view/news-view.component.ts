import { Component } from '@angular/core';
import { News } from '../../models/news.model';
import { NewsService } from '../../services/news.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-news-view',
  standalone: false,
  templateUrl: './news-view.component.html',
  styleUrl: './news-view.component.css'
})
export class NewsViewComponent {
  newsList: News[] = [];
  currentPage = 1;
  totalPages = 0;
  mainNews?: News;

  constructor(private newsService: NewsService) { }

  ngOnInit(): void {
    this.loadNews(this.currentPage);
  }

  loadNews(page: number): void {
    this.newsService.getNews(page).subscribe(data => {
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
    });
  }

  private formatImageUrl(imagePath: string): string {
    return `${environment.imageServerUrl}${imagePath}`;
  }

}
