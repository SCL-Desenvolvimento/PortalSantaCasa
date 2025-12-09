import { Component, OnInit, ViewChild } from '@angular/core';
import { NewsService } from '../../../core/services/news.service';
import { News } from '../../../models/news.model';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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

  // Configuração do Quill Editor
  quillConfig = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 1 }, { 'header': 2 }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['link', 'image', 'video']
    ]
  };

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
  perPage = 9;
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
      this.loadNews();
    });
    this.department = this.authService.getUserInfo('department');
  }

  // Atualiza o conteúdo quando o editor muda
  onContentChanged(event: any) {
    // O Quill emite tanto 'text' quanto 'html'
    this.newsData.content = event.html || '';
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
      authorName: '',
      category: ''
    };
  }

  // =====================
  // 📌 Getters Condicionais
  // =====================
  get newsTerm(): string {
    return this.isQualityMinute ? 'Minuto de Qualidade' : 'Notícia';
  }

  get newsTermPlural(): string {
    return this.isQualityMinute ? 'Minutos de Qualidade' : 'Notícias';
  }

  // =====================
  // 📌 CRUD
  // =====================
  loadNews(page: number = this.currentPage): void {
    this.newsService.getNewsPaginated(page, this.perPage, this.isQualityMinute).subscribe({
      next: (data) => {
        this.newsList = data.news
          .filter(n => n.department == this.department)
          .map(n => ({
            ...n,
            imageUrl: n.imageUrl ? `${environment.serverUrl}${n.imageUrl}` : ''
          }));

        this.currentPage = data.currentPage;
        this.perPage = data.perPage;
        this.totalPages = data.pages;

        this.applyFilters();
      },
      error: () => this.toastr.error(`Erro ao carregar ${this.newsTermPlural.toLowerCase()}`)
    });
    this.loadTotals();
  }

  loadTotals(): void {
    this.newsService.getNewsTotals(this.isQualityMinute).subscribe({
      next: (data) => {
        this.totalNews = data.totalNews;
        this.activeNews = data.activeNews;
        this.inactiveNews = data.inactiveNews;
      },
      error: () => this.toastr.error(`Erro ao carregar totais de ${this.newsTermPlural.toLowerCase()}`)
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      this.imageFile = input.files[0];

      // Mostrar preview da imagem
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newsData.imageUrl = e.target.result;
      };
      reader.readAsDataURL(this.imageFile);
    }
  }

  saveNews(): void {
    // Validação básica
    if (!this.newsData.content || this.newsData.content.trim() === '') {
      this.toastr.error('O conteúdo é obrigatório');
      return;
    }

    this.isLoading = true;

    const formData = new FormData();
    formData.append('title', this.newsData.title);
    formData.append('summary', this.newsData.summary);
    formData.append('content', this.newsData.content); // Usando newsData.content diretamente
    formData.append('isActive', String(this.newsData.isActive));
    formData.append('createdAt', this.createdAtFormatted);
    formData.append('isQualityMinute', String(this.isQualityMinute));

    // Adiciona departamento se disponível
    if (this.department) {
      formData.append('department', this.department);
    }

    if (this.imageFile) {
      formData.append('file', this.imageFile, this.imageFile.name);
    }

    console.log('Enviando conteúdo:', this.newsData.content);

    const request = this.isEdit && this.newsData?.id
      ? this.newsService.updateNews(this.newsData.id, formData)
      : this.newsService.createNews(formData);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.closeModal();
        this.loadNews(this.currentPage);
        this.toastr.success(`${this.newsTerm} salva com sucesso!`);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erro ao salvar:', error);
        this.toastr.error(`Erro ao salvar ${this.newsTerm.toLowerCase()}`);
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
            this.toastr.success(`${this.newsTerm} excluída com sucesso`);
          },
          error: () => this.toastr.error(`Erro ao excluir ${this.newsTerm.toLowerCase()}`)
        });
      }
    });
  }

  toggleNewsStatus(news: News): void {
    const newStatus = !news.isActive;
    const formData = new FormData();
    formData.append('title', news.title);
    formData.append('summary', news.summary);
    formData.append('content', news.content);
    formData.append('isActive', String(newStatus));
    formData.append('createdAt', news.createdAt);
    formData.append('isQualityMinute', String(news.isQualityMinute));

    if (!news.id)
      return;

    this.newsService.updateNews(news.id, formData).subscribe({
      next: () => {
        news.isActive = newStatus;
        this.loadTotals();
        this.applyFilters();
        this.toastr.success(`Status atualizado para ${newStatus ? 'Ativa' : 'Inativa'}`);
      },
      error: () => this.toastr.error('Erro ao atualizar status')
    });
  }

  // =====================
  // 📌 Modal
  // =====================
  showNewsModal(newsId?: number): void {
    this.isEdit = !!newsId;
    this.modalTitle = this.isEdit ? `Editar ${this.newsTerm}` : `Nova ${this.newsTerm}`;

    if (newsId) {
      this.newsService.getNewsById(newsId).subscribe({
        next: (news) => {
          console.log('Dados da notícia:', news);
          this.newsData = {
            ...news,
            imageUrl: news.imageUrl ? `${environment.serverUrl}${news.imageUrl}` : '',
          };
          // Garantir que o conteúdo está preenchido
          if (!this.newsData.content) {
            this.newsData.content = '';
          }
          this.createdAtFormatted = this.formatDate(news.createdAt);
          this.openModal();
        },
        error: () => this.toastr.error(`Erro ao carregar ${this.newsTerm.toLowerCase()}`)
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
    this.imageFile = null;
  }

  // =====================
  // 📌 Busca e filtros
  // =====================
  onSearch(): void {
    this.applyFilters();
  }

  setStatusFilter(filter: 'all' | 'active' | 'inactive') {
    this.statusFilter = filter;

    this.newsService.getNewsPaginated(1, this.perPage, this.isQualityMinute, filter).subscribe({
      next: data => {
        this.newsList = data.news.filter(n => n.department == this.department).map(n => ({
          ...n,
          imageUrl: n.imageUrl ? `${environment.serverUrl}${n.imageUrl}` : ''
        }));

        this.filteredNews = this.newsList;
        this.currentPage = 1;
        this.totalPages = data.pages;
      }
    });
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
