import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NewsService } from '../../core/services/news.service';
import { environment } from '../../../environments/environment';
import { News } from '../../models/news.model';

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

  constructor(
    private newsService: NewsService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(paramMap => {
      const newsId = paramMap.get('id');
      if (newsId) {
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

  navigateToNews(id: number | undefined) { this.router.navigate(['/noticia', id]); }

  shareNews() {
    if (navigator.share) {
      navigator.share({ title: this.news.title, text: this.news.summary, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => alert('Link copiado!'));
    }
  }

  printNews() { window.print(); }

  private cleanHtmlContent(content: string | undefined): string {
    if (!content) return '';
    return content.replace(/&nbsp;/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/<p><\/p>/g, '').trim();
  }
}
