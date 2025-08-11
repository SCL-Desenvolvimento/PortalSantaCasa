import { Component } from '@angular/core';
import { Banner } from '../../../models/banner.model';
import { BannerService } from '../../../services/banner.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-banners',
  standalone: false,
  templateUrl: './banners.component.html',
  styleUrl: './banners.component.css'
})
export class BannersComponent {
  banners: Banner[] = [];
  modalTitle = '';
  showModal = false;
  isEdit = false;
  selectedBanner: Banner | null = null;
  bannerForm: Banner = {
    id: 0,
    title: '',
    description: '',
    imageUrl: '',
    order: 0,
    timeSeconds: 5,
    isActive: true
  };
  imageFile: File | null = null;
  message: { text: string, type: string } | null = null;

  constructor(private bannerService: BannerService) { }

  ngOnInit(): void {
    this.loadBanners();
  }

  loadBanners(): void {
    this.bannerService.getBanners().subscribe({
      next: (banners) => {
        this.banners = banners.map(b => ({
          ...b,
          imageUrl: `${environment.imageServerUrl}${b.imageUrl}`
        }));
      },
      error: (err) => this.showMessage('Erro ao carregar banners', 'error')
    });
  }

  showBannerForm(bannerId?: number): void {
    this.isEdit = !!bannerId;
    this.modalTitle = this.isEdit ? 'Editar Banner' : 'Novo Banner';

    if (bannerId) {
      this.bannerService.getBannerById(bannerId).subscribe({
        next: (banner) => {
          this.selectedBanner = banner;
          this.bannerForm = {
            ...banner,
            imageUrl: `${environment.imageServerUrl}${banner.imageUrl}`
          };
          this.openModal();
        },
        error: () => this.showMessage('Erro ao carregar banner', 'error')
      });
    } else {
      // pega o maior número de ordem existente e soma 1
      const maxOrder = this.banners.length > 0 ? Math.max(...this.banners.map(b => b.order)) : 0;
      this.selectedBanner = null;
      this.bannerForm = {
        id: 0,
        title: '',
        description: '',
        imageUrl: '',
        order: maxOrder + 1,
        timeSeconds: 5,
        isActive: true
      };
      this.imageFile = null;
      this.openModal();
    }
  }

  saveBanner(): void {
    // Validação de ordem duplicada
    const ordemExistente = this.banners.some(b =>
      b.order === this.bannerForm.order &&
      (!this.isEdit || b.id !== this.selectedBanner?.id) // permite mesmo número se for o mesmo registro
    );

    if (ordemExistente) {
      this.showMessage(`Já existe um banner com a ordem ${this.bannerForm.order}.`, 'error');
      return;
    }

    const formData = new FormData();
    formData.append('title', this.bannerForm.title);
    formData.append('description', this.bannerForm.description);
    formData.append('order', this.bannerForm.order.toString());
    formData.append('timeSeconds', this.bannerForm.timeSeconds.toString());
    formData.append('isActive', this.bannerForm.isActive.toString());

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
        this.showMessage('Banner salvo com sucesso!', 'success');
      },
      error: () => this.showMessage('Erro ao salvar banner', 'error')
    });
  }


  deleteBanner(id: number): void {
    if (confirm('Tem certeza que deseja excluir este banner?')) {
      this.bannerService.deleteBanner(id).subscribe({
        next: () => {
          this.loadBanners();
          this.showMessage('Banner removido', 'success');
        },
        error: () => this.showMessage('Erro ao excluir banner', 'error')
      });
    }
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

  showMessage(text: string, type: string): void {
    this.message = { text, type };
    setTimeout(() => (this.message = null), 3000);
  }

}
