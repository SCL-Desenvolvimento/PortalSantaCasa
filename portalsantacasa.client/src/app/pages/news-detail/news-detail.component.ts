import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NewsService } from '../../services/news.service';

@Component({
  selector: 'app-news-detail',
  standalone: false,
  templateUrl: './news-detail.component.html',
  styleUrls: ['./news-detail.component.css']
})
export class NewsDetailComponent implements OnInit {
  news: any;
  relatedNews: any[] = [];
  isLoading = true;
  hasError = false;

  constructor(
    private newsService: NewsService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    const newsId = this.route.snapshot.paramMap.get('id');
    if (newsId) {
      this.fetchNews(Number(newsId));
    } else {
      this.isLoading = false;
      this.hasError = true;
    }
  }

  fetchNews(id: number) {
    this.newsService.getNewsById(id).subscribe({
      next: (data) => {
        this.news = data;
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
    this.newsService.getNews().subscribe({
      next: (data) => {
        this.relatedNews = data
          .filter((news: any) => news.id !== currentId)
          .slice(0, 3);
      }
    });
  }

  goBack() {
    this.router.navigate(['/']);
  }

  navigateToNews(id: string) {
    this.router.navigate(['/news', id]);
  }

  shareNews() {
    if (navigator.share) {
      navigator.share({
        title: this.news.title,
        text: this.news.description,
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
