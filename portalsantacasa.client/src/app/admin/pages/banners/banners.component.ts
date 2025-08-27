import { Component, OnInit } from '@angular/core';
import { Banner } from '../../../models/banner.model';
import { BannerService } from '../../../services/banner.service';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { News } from '../../../models/news.model';
import { NewsService } from '../../../services/news.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-banners',
  standalone: false,
  templateUrl: './banners.component.html',
  styleUrl: './banners.component.css'
})
export class BannersComponent implements OnInit {
  banners: Banner[] = [];
  news: News[] = [];
  modalTitle = '';
  showModal = false;
  isEdit = false;
  selectedBanner: Banner | null = null;
  bannerForm: Banner = this.getEmptyBanner();
  imageFile: File | null = null;
  selectedNewsId: number | null = null;
  department: string | null = null;

  constructor(
    private bannerService: BannerService,
    private newsService: NewsService,
    private authService: AuthService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadBanners();
    this.loadNews();

    this.department = this.authService.getUserInfo('department');
  }

  private getEmptyBanner(): Banner {
    const maxOrder = this.banners.length > 0 ? Math.max(...this.banners.map(b => b.order)) : 0;
    return {
      id: 0,
      title: '',
      description: '',
      imageUrl: '',
      order: maxOrder + 1,
      timeSeconds: 5,
      isActive: true,
      newsId: 0
    };
  }

  loadBanners(): void {
    this.bannerService.getBanners().subscribe({
      next: (banners) => {
        this.banners = banners.map(b => ({
          ...b,
          imageUrl: `${environment.imageServerUrl}${b.imageUrl}`
        }));
      },
      error: () => this.toastr.error('Erro ao carregar banners')
    });
  }

  loadNews(): void {
    this.newsService.getNewsPaginated().subscribe({
      next: (data) => {
        this.news = data.news.filter(n => n.isActive && n.department == this.department);
      },
      error: () => this.toastr.error('Erro ao carregar notícias')
    });
  }

  getSelectedNewsTitle(): string {
    if (!this.selectedNewsId) return 'Selecione uma notícia';
    const selectedNews = this.news.find(n => n.id === this.selectedNewsId);
    return selectedNews ? selectedNews.title : 'Notícia não encontrada';
  }

  showBannerForm(bannerId?: number): void {
    this.isEdit = !!bannerId;
    this.modalTitle = this.isEdit ? 'Editar Banner' : 'Novo Banner';

    if (bannerId) {
      this.bannerService.getBannerById(bannerId).subscribe({
        next: (banner) => {
          this.selectedBanner = banner;
          this.bannerForm = { ...banner, imageUrl: `${environment.imageServerUrl}${banner.imageUrl}` };
          this.selectedNewsId = banner.newsId || null;
          this.openModal();
        },
        error: () => this.toastr.error('Erro ao carregar banner')
      });
    } else {
      this.selectedBanner = null;
      this.bannerForm = this.getEmptyBanner();
      this.imageFile = null;
      this.selectedNewsId = null;
      this.openModal();
    }
  }

  saveBanner(): void {
    const ordemExistente = this.banners.some(b =>
      b.order === this.bannerForm.order &&
      (!this.isEdit || b.id !== this.selectedBanner?.id)
    );

    if (ordemExistente) {
      this.toastr.error(`Já existe um banner com a ordem ${this.bannerForm.order}.`);
      return;
    }

    const formData = new FormData();
    formData.append('title', this.bannerForm.title);
    formData.append('description', this.bannerForm.description);
    formData.append('order', this.bannerForm.order.toString());
    formData.append('timeSeconds', this.bannerForm.timeSeconds.toString());
    formData.append('isActive', this.bannerForm.isActive.toString());
    if (this.selectedNewsId != null && this.selectedNewsId != 0) {
      console.log("Entrou ", this.selectedNewsId)
      formData.append('newsId', this.selectedNewsId.toString());
    }

    if (this.imageFile) {
      formData.append('file', this.imageFile, this.imageFile.name);
    }

    const request = this.isEdit && this.selectedBanner?.id
      ? this.bannerService.updateBanner(this.selectedBanner.id, formData)
      : this.bannerService.createBanner(formData);

    request.subscribe({
      next: () => {
        this.closeModal();
        this.loadBanners();
        this.toastr.success('Banner salvo com sucesso!');
      },
      error: () => this.toastr.error('Erro ao salvar banner')
    });
  }

  deleteBanner(id: number): void {
    Swal.fire({
      title: 'Tem certeza?',
      text: 'Você não poderá reverter esta ação!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.bannerService.deleteBanner(id).subscribe({
          next: () => {
            this.loadBanners();
            this.toastr.success('Banner removido com sucesso');
          },
          error: () => this.toastr.error('Erro ao excluir banner')
        });
      }
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.imageFile = input.files[0];
    }
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  canSave(): boolean {
    if (this.isEdit) {
      // No modo edição, permite salvar se existir imagem atual ou nova imagem
      return !!this.bannerForm.imageUrl || !!this.imageFile;
    }
    // No modo novo, só permite salvar se tiver imagem carregada
    return !!this.imageFile;
  }
}
