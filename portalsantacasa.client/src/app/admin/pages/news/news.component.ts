import { Component, OnInit } from '@angular/core';
import { NewsService } from '../../../services/news.service';
import { News } from '../../../models/news.model';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-news',
  standalone: false,
  templateUrl: './news.component.html',
  styleUrls: ['./news.component.css']
})
export class NewsComponent implements OnInit {
  // =====================
  // 📌 Dados principais
  // =====================
  newsList: News[] = [];
  filteredNews: News[] = [];

  totalNews = 0;
  activeNews = 0;
  inactiveNews = 0;
  quillContent = '';
  imageFile: File | null = null;
  isQualityMinute: boolean = false;
  department: string | null = null;

  // Filtros e busca
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  // Modal
  modalTitle = '';
  showModal = false;
  isEdit = false;
  isLoading = false;

  // Dados do formulário
  newsData: News = this.getEmptyNews();
  createdAtFormatted: string = '';

  // Paginação
  currentPage = 1;
  perPage = 10;
  totalPages = 0;

  constructor(
    private newsService: NewsService,
    private toastr: ToastrService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.isQualityMinute = params['quality'] === 'true';
      this.loadNews(this.currentPage);
    });
    this.department = this.authService.getUserInfo('department');

    this.loadNews(this.currentPage);
  }


  private getEmptyNews(): News {
    return {
      id: 0,
      title: '',
      summary: '',
      content: '',
      imageUrl: '',
      isActive: true,
      createdAt: '',
      department: '',
      isQualityMinute: false,
      authorName: ''
    };
  }

  // =====================
  // 📌 CRUD
  // =====================
  loadNews(page: number = 1): void {
    this.newsService.getNewsPaginated(page, this.perPage).subscribe({
      next: (data) => {
        this.newsList = data.news
          .filter(n => n.department == this.department && n.isQualityMinute == this.isQualityMinute)
          .map(n => ({
          ...n,
          imageUrl: n.imageUrl ? `${environment.imageServerUrl}${n.imageUrl}` : ''
        }));

        this.totalNews = this.newsList.length;
        this.activeNews = this.newsList.filter(n => n.isActive).length;
        this.inactiveNews = this.totalNews - this.activeNews;

        this.currentPage = data.currentPage;
        this.perPage = data.perPage;
        this.totalPages = data.pages;

        this.applyFilters();
      },
      error: () => this.toastr.error('Erro ao carregar notícias')
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      this.imageFile = input.files[0];
    }
  }

  saveNews(): void {
    this.isLoading = true;

    const formData = new FormData();
    formData.append('title', this.newsData.title);
    formData.append('summary', this.newsData.summary);
    formData.append('content', this.quillContent);
    formData.append('isActive', String(this.newsData.isActive));
    formData.append('createdAt', this.createdAtFormatted);
    formData.append('isQualityMinute', String(this.isQualityMinute));
    formData.append('userId', this.authService.getUserInfo('id')?.toString() ?? '');

    if (this.imageFile) {
      formData.append('file', this.imageFile, this.imageFile.name);
    }

    const request = this.isEdit && this.newsData?.id
      ? this.newsService.updateNews(this.newsData.id, formData)
      : this.newsService.createNews(formData);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.closeModal();
        this.loadNews(this.currentPage);
        this.toastr.success('Notícia salva com sucesso!');
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Erro ao salvar notícia');
      }
    });
  }

  deleteNews(id?: number): void {
    if (!id) return;

    Swal.fire({
      title: 'Tem certeza?',
      text: 'Esta ação não pode ser desfeita!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.newsService.deleteNews(id).subscribe({
          next: () => {
            this.loadNews(this.currentPage);
            this.toastr.success('Notícia excluída com sucesso');
          },
          error: () => this.toastr.error('Erro ao excluir notícia')
        });
      }
    });
  }

  toggleNewsStatus(news: News): void {
    //const updated = { ...news, isActive: !news.isActive };

    const formData = new FormData();
    formData.append('title', news.title);
    formData.append('summary', news.summary);
    formData.append('content', this.quillContent);
    formData.append('isActive', String(!news.isActive));
    formData.append('createdAt', news.createdAt);

    if (!news.id)
      return;

    this.newsService.updateNews(news.id, formData).subscribe({
      next: () => {
        news.isActive = !news.isActive;
        this.applyFilters();
        this.toastr.success('Status atualizado com sucesso');
      },
      error: () => this.toastr.error('Erro ao atualizar status')
    });
  }

  // =====================
  // 📌 Modal
  // =====================
  showNewsModal(newsId?: number): void {
    this.isEdit = !!newsId;
    this.modalTitle = this.isEdit ? 'Editar Notícia' : 'Nova Notícia';

    if (newsId) {
      this.newsService.getNewsById(newsId).subscribe({
        next: (news) => {
          this.newsData = {
            ...news,
            imageUrl: `${environment.imageServerUrl}${news.imageUrl}`,
          };
          this.quillContent = news.content;
          this.createdAtFormatted = this.formatDate(news.createdAt);
          this.openModal();
        },
        error: () => this.toastr.error('Erro ao carregar notícia')
      });
    } else {
      this.newsData = this.getEmptyNews();
      this.createdAtFormatted = this.formatDate(new Date());
      this.openModal();
    }
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.newsData = this.getEmptyNews();
    this.isEdit = false;
    this.isLoading = false;
    this.quillContent = '';
  }

  // =====================
  // 📌 Busca e filtros
  // =====================
  onSearch(): void {
    this.applyFilters();
  }

  setStatusFilter(filter: 'all' | 'active' | 'inactive'): void {
    this.statusFilter = filter;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredNews = this.newsList.filter(news => {
      const matchesSearch =
        !this.searchTerm ||
        news.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        news.summary.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && news.isActive) ||
        (this.statusFilter === 'inactive' && !news.isActive);

      return matchesSearch && matchesStatus;
    });
  }

  // =====================
  // 📌 Paginação
  // =====================
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.loadNews(page);
    }
  }

  // =====================
  // 📌 Helpers
  // =====================
  getNewsDay(date: Date | string): string {
    return new Date(date).getDate().toString().padStart(2, '0');
  }

  getNewsMonth(date: Date | string): string {
    return new Date(date).toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }
}
