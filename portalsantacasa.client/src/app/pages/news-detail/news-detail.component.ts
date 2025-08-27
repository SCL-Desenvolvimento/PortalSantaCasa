import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NewsService } from '../../services/news.service';
import { environment } from '../../../environments/environment';
import { News } from '../../models/news.model';

@Component({
  selector: 'app-news-detail',
  standalone: false,
  templateUrl: './news-detail.component.html',
  styleUrls: ['./news-detail.component.css']
})
export class NewsDetailComponent implements OnInit {
  news: News = { title: '', isActive: true, createdAt: '', imageUrl: '', isQualityMinute: false };
  relatedNews: News[] = [];
  isLoading = true;
  hasError = false;

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

  fetchNews(id: number) {
    this.newsService.getNewsById(id).subscribe({
      next: (data) => {
        this.news = { ...data, imageUrl: `${environment.imageServerUrl}${data.imageUrl}` };
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
        this.relatedNews = data.news.map(news => ({
          ...news,
          imageUrl: `${environment.imageServerUrl}${news.imageUrl}`
        }))
          .filter((news: any) => news.id !== currentId)
          .slice(0, 3);
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }

  navigateToNews(id: number | undefined) {
    console.log(id);
    this.router.navigate(['/noticia', id]);
  }

  shareNews() {
    if (navigator.share) {
      navigator.share({
        title: this.news.title,
        text: this.news.summary,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  }

  printNews() {
    window.print();
  }
}
