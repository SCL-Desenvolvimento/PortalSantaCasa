import { Component, OnInit } from '@angular/core';
import { NewsService } from '../../../services/news.service';
import { News } from '../../../models/news.model';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';

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

  constructor(
    private newsService: NewsService,
    private toastr: ToastrService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadNews();
  }

  private getEmptyNews(): News {
    return { title: '', summary: '', content: '', imageUrl: '', isActive: true, createdAt: '' };
  }

  loadNews(): void {
    this.newsService.getNews().subscribe({
      next: (data) => {
        this.newsList = data.news.map(n => ({
          ...n,
          imageUrl: `${environment.imageServerUrl}${n.imageUrl}`
        }));
      },
      error: () => this.toastr.error('Erro ao carregar notícias')
    });
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
        this.loadNews();
        this.toastr.success('Notícia salva com sucesso!');
      },
      error: () => this.toastr.error('Erro ao salvar notícia')
    });
  }

  deleteNews(id?: number): void {
    if (!id)
      return;

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
            this.loadNews();
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
