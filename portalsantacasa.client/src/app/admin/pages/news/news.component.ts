import { Component, OnInit } from '@angular/core';
import { NewsService } from '../../../services/news.service';
import { News } from '../../../models/news.model';

@Component({
  selector: 'app-news',
  standalone: false,
  templateUrl: './news.component.html',
  styleUrl: './news.component.css'
})
export class NewsComponent implements OnInit {
  newsList: News[] = [];
  modalTitle: string = '';
  showModal: boolean = false;
  isEdit: boolean = false;
  selectedNews: News | null = null;
  newsForm: News = { title: '', is_active: true, created_at: '' };
  quillContent: string = '';
  imageFile: File | null = null;
  message: { text: string, type: string } | null = null;
  editorModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],        // formatos básicos
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ align: [] }],
      [{ color: [] }, { background: [] }],
      ['link', 'image', 'video'],
      ['clean'],                                         // remover formatação
    ]
  };

  constructor(private newsService: NewsService) { }

  ngOnInit(): void {
    this.loadNewsAdmin();
  }

  loadNewsAdmin(): void {
    //this.newsService.getNews().subscribe({
    //  next: (data) => {
    //    this.newsList = data;
    //  },
    //  error: (error) => {
    //    this.showMessage(`Erro ao carregar notícias: ${error.message}`, 'error');
    //  }
    //});
  }

  showNewsForm(newsId: number | null = null): void {
    this.isEdit = newsId !== null;
    this.modalTitle = this.isEdit ? 'Editar Notícia' : 'Nova Notícia';
    if (newsId) {
      this.newsService.getNewsById(newsId).subscribe({
        next: (news) => {
          this.selectedNews = news;
          this.newsForm = { ...news };
          this.quillContent = news.content || '';
          this.openModal();
        },
        error: (error) => {
          this.showMessage(`Erro ao carregar notícia: ${error.message}`, 'error');
        }
      });
    } else {
      this.selectedNews = null;
      this.newsForm = { title: '', is_active: true, created_at: '' };
      this.quillContent = '';
      this.imageFile = null;
      this.openModal();
    }
  }

  saveNews(): void {
    const formData = new FormData();
    formData.append('title', this.newsForm.title);
    formData.append('summary', this.newsForm.summary || '');
    formData.append('content', this.quillContent);
    formData.append('is_active', this.newsForm.is_active.toString());
    if (this.imageFile) {
      this.newsService.uploadFile(this.imageFile).subscribe({
        next: (data) => {
          formData.append('image_url', data.file_url);
          this.submitNewsForm(formData);
        },
        error: (error) => {
          this.showMessage('Erro ao fazer upload da imagem', 'error');
        }
      });
    } else {
      this.submitNewsForm(formData);
    }
  }

  submitNewsForm(formData: FormData): void {
    const request = this.isEdit && this.selectedNews?.id
      ? this.newsService.updateNews(this.selectedNews.id, formData)
      : this.newsService.createNews(formData);
    request.subscribe({
      next: (data) => {
        this.closeModal();
        this.showMessage(data.message, 'success');
        this.loadNewsAdmin();
      },
      error: (error) => {
        this.showMessage(error.message || 'Erro ao salvar notícia', 'error');
      }
    });
  }

  deleteNews(newsId?: number): void {
    if (!newsId) {
      console.warn('ID inválido ao tentar deletar notícia.');
      return;
    }

    if (confirm('Tem certeza que deseja excluir esta notícia?')) {
      this.newsService.deleteNews(newsId).subscribe({
        next: (data) => {
          this.showMessage(data.message, 'success');
          this.loadNewsAdmin();
        },
        error: (error) => {
          this.showMessage(error.message || 'Erro ao excluir notícia', 'error');
        }
      });
    }
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }

  onFileChange(event: Event, type: 'image' | 'document' | 'photo'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      if (type === 'image') {
        this.imageFile = input.files[0];
      }
    }
  }
}
