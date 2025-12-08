import { Component, OnInit } from '@angular/core';
import { Banner } from '../../../models/banner.model';
import { BannerService } from '../../../core/services/banner.service';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { News } from '../../../models/news.model';
import { NewsService } from '../../../core/services/news.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-banners',
  standalone: false,
  templateUrl: './banners.component.html',
  styleUrl: './banners.component.css'
})
export class BannersComponent implements OnInit {
  // =====================
  // 📌 Dados principais
  // =====================
  bannersList: Banner[] = [];
  filteredBanners: Banner[] = [];
  news: News[] = [];

  totalBanners = 0;
  activeBanners = 0;
  inactiveBanners = 0;

  // Filtros e busca
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  // Modal
  modalTitle = '';
  showModal = false;
  isEdit = false;
  isLoading = false;

  // Dados do formulário
  selectedBanner: Banner | null = null;
  bannerForm: Banner = this.getEmptyBanner();
  imageFile: File | null = null;
  selectedNewsId: number | null = null;
  department: string | null = null;

  // Paginação
  currentPage = 1;
  perPage = 10;
  totalPages = 0;

  constructor(
    private bannerService: BannerService,
    private newsService: NewsService,
    private authService: AuthService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.department = this.authService.getUserInfo('department');
    this.loadBanners();
    this.loadNews();
  }

  private getEmptyBanner(): Banner {
    const maxOrder = this.bannersList.length > 0 ? Math.max(...this.bannersList.map(b => b.order)) : 0;
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

  // =====================
  // 📌 CRUD
  // =====================
  loadBanners(): void {
    this.bannerService.getBanners().subscribe({
      next: (banners) => {
        this.bannersList = banners.map(b => ({
          ...b,
          imageUrl: b.imageUrl ? `${environment.serverUrl}${b.imageUrl}` : ''
        }));

        this.totalBanners = this.bannersList.length;
        this.activeBanners = this.bannersList.filter(b => b.isActive).length;
        this.inactiveBanners = this.totalBanners - this.activeBanners;

        this.applyFilters();
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

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      this.imageFile = input.files[0];
    }
  }

  saveBanner(): void {
    const ordemExistente = this.bannersList.some(b =>
      b.order === this.bannerForm.order &&
      (!this.isEdit || b.id !== this.selectedBanner?.id)
    );

    if (ordemExistente) {
      this.toastr.error(`Já existe um banner com a ordem ${this.bannerForm.order}.`);
      return;
    }

    this.isLoading = true;

    const formData = new FormData();
    formData.append('title', this.bannerForm.title);
    formData.append('description', this.bannerForm.description);
    formData.append('order', this.bannerForm.order.toString());
    formData.append('timeSeconds', this.bannerForm.timeSeconds.toString());
    formData.append('isActive', this.bannerForm.isActive.toString());

    if (this.selectedNewsId != null && this.selectedNewsId != 0) {
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
        this.isLoading = false;
        this.closeModal();
        this.loadBanners();
        this.toastr.success('Banner salvo com sucesso!');
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Erro ao salvar banner');
      }
    });
  }

  deleteBanner(id: number): void {
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
        this.bannerService.deleteBanner(id).subscribe({
          next: () => {
            this.loadBanners();
            this.toastr.success('Banner excluído com sucesso');
          },
          error: () => this.toastr.error('Erro ao excluir banner')
        });
      }
    });
  }

  toggleBannerStatus(banner: Banner): void {
    const formData = new FormData();
    formData.append('title', banner.title);
    formData.append('description', banner.description);
    formData.append('order', banner.order.toString());
    formData.append('timeSeconds', banner.timeSeconds.toString());
    formData.append('isActive', String(!banner.isActive));

    if (banner.newsId) {
      formData.append('newsId', banner.newsId.toString());
    }

    if (!banner.id) return;

    this.bannerService.updateBanner(banner.id, formData).subscribe({
      next: () => {
        banner.isActive = !banner.isActive;
        this.applyFilters();
        this.toastr.success('Status atualizado com sucesso');
      },
      error: () => this.toastr.error('Erro ao atualizar status')
    });
  }

  // =====================
  // 📌 Modal
  // =====================
  showBannerForm(bannerId?: number): void {
    this.isEdit = !!bannerId;
    this.modalTitle = this.isEdit ? 'Editar Banner' : 'Novo Banner';

    if (bannerId) {
      this.bannerService.getBannerById(bannerId).subscribe({
        next: (banner) => {
          this.selectedBanner = banner;
          this.bannerForm = {
            ...banner,
            imageUrl: banner.imageUrl ? `${environment.serverUrl}${banner.imageUrl}` : ''
          };
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

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.bannerForm = this.getEmptyBanner();
    this.selectedBanner = null;
    this.isEdit = false;
    this.isLoading = false;
    this.imageFile = null;
    this.selectedNewsId = null;
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
    this.filteredBanners = this.bannersList.filter(banner => {
      const matchesSearch =
        !this.searchTerm ||
        banner.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        banner.description.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && banner.isActive) ||
        (this.statusFilter === 'inactive' && !banner.isActive);

      return matchesSearch && matchesStatus;
    });

    // Ordenar por ordem
    this.filteredBanners.sort((a, b) => a.order - b.order);
  }

  // =====================
  // 📌 Paginação
  // =====================
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadBanners();
    }
  }

  // =====================
  // 📌 Helpers
  // =====================
  getSelectedNewsTitle(): string {
    if (!this.selectedNewsId) return 'Selecione uma notícia';
    const selectedNews = this.news.find(n => n.id === this.selectedNewsId);
    return selectedNews ? selectedNews.title : 'Notícia não encontrada';
  }

  getBannerNewsTitle(newsId?: number): string {
    if (!newsId) return '';
    const news = this.news.find(n => n.id === newsId);
    return news ? news.title : '';
  }

  canSave(): boolean {
    if (this.isEdit) {
      // No modo edição, permite salvar se existir imagem atual ou nova imagem
      return !!this.bannerForm.imageUrl || !!this.imageFile;
    }
    // No modo novo, só permite salvar se tiver imagem carregada
    return !!this.imageFile;
  }

  // Getter para acessar banners no template
  get banners(): Banner[] {
    return this.bannersList;
  }
}

