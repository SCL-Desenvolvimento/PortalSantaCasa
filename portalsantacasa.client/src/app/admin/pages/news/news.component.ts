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
  styleUrl: './news.component.css'
})
export class NewsComponent implements OnInit {
  newsList: News[] = [];
  modalTitle = '';
  showModal = false;
  isEdit = false;
  newsForm: News = this.getEmptyNews();
  quillContent = '';
  imageFile: File | null = null;
  department: string | null = null;
  isQualityMinute: boolean = false;

  // paginação
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
      this.isQualityMinute = params['isQualityMinute'] === 'true';
      this.loadNews();
    });

    this.department = this.authService.getUserInfo('department');
  }

  private getEmptyNews(): News {
    return { title: '', summary: '', content: '', imageUrl: '', isActive: true, createdAt: '', isQualityMinute: false };
  }

  loadNews(page: number = 1): void {
    this.newsService.getNewsPaginated(page, this.perPage).subscribe({
      next: (data) => {
        this.currentPage = data.currentPage;
        this.perPage = data.perPage;
        this.totalPages = data.pages;

        this.newsList = data.news
          .filter(n => n.department == this.department && n.isQualityMinute == this.isQualityMinute)
          .map(n => ({
            ...n,
            imageUrl: `${environment.imageServerUrl}${n.imageUrl}`
          }));
      },
      error: () => this.toastr.error('Erro ao carregar notícias')
    });
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.loadNews(page);
    }
  }

  showNewsForm(newsId?: number): void {
    this.isEdit = !!newsId;
    this.modalTitle = this.isEdit ? 'Editar Notícia' : 'Nova Notícia';

    if (newsId) {
      this.newsService.getNewsById(newsId).subscribe({
        next: (news) => {
          this.newsForm = { ...news, imageUrl: `${environment.imageServerUrl}${news.imageUrl}` };
          this.quillContent = news.content || '';
          this.openModal();
        },
        error: () => this.toastr.error('Erro ao carregar notícia')
      });
    } else {
      this.newsForm = this.getEmptyNews();
      this.openModal();
    }
  }

  saveNews(): void {
    const formData = new FormData();
    formData.append('title', this.newsForm.title);
    formData.append('summary', this.newsForm.summary || '');
    formData.append('content', this.quillContent);
    formData.append('isActive', this.newsForm.isActive.toString());
    formData.append('isQualityMinute', String(this.isQualityMinute));
    formData.append('userId', this.authService.getUserInfo('id')?.toString() ?? '');

    if (this.imageFile) {
      formData.append('file', this.imageFile, this.imageFile.name);
    }

    const request = this.isEdit && this.newsForm?.id
      ? this.newsService.updateNews(this.newsForm.id, formData)
      : this.newsService.createNews(formData);

    request.subscribe({
      next: () => {
        this.closeModal();
        this.loadNews(this.currentPage);
        this.toastr.success('Notícia salva com sucesso!');
      },
      error: () => this.toastr.error('Erro ao salvar notícia')
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
      cancelButtonText: 'Cancelar',
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

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      this.imageFile = input.files[0];
    }
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.quillContent = '';
  }

  canSave(): boolean {
    return this.newsForm.title.trim().length > 0 && (this.isEdit || !!this.imageFile);
  }
}
