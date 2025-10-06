import { Component } from '@angular/core';
import { InternalAnnouncement } from '../../../models/internal-announcement.model';
import { InternalAnnouncementService } from '../../../core/services/internal-announcement.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-internal-announcement',
  standalone: false,
  templateUrl: './internal-announcement.component.html',
  styleUrl: './internal-announcement.component.css'
})
export class InternalAnnouncementComponent {
  modalTitle = '';
  showModal = false;
  isEdit = false;
  internalAnnouncementForm!: InternalAnnouncement;
  quillContent = '';

  // paginação
  currentPage = 1;
  perPage = 10;
  totalPages = 0;
  totalCount = 0;

  internalAnnouncementList: InternalAnnouncement[] = [];

  constructor(
    private internalAnnouncementService: InternalAnnouncementService,
    private toastr: ToastrService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.internalAnnouncementForm = this.getEmptyInternalAnnouncement();

    this.route.queryParams.subscribe(() => {
      this.loadInternalAnnouncement();
    });
  }

  private getEmptyInternalAnnouncement(): InternalAnnouncement {
    return {
      title: '',
      content: '',
      publishDate: new Date(),
      expirationDate: undefined,
      isActive: true,
      userId: this.authService.getUserInfo('id') ?? 0
    };
  }

  loadInternalAnnouncement(page: number = 1): void {
    this.internalAnnouncementService.getPaginated(page, this.perPage).subscribe({
      next: (data) => {
        this.internalAnnouncementList = data.items;
        this.currentPage = data.currentPage;
        this.perPage = data.perPage;
        this.totalPages = data.totalPages;
        this.totalCount = data.totalCount;
      },
      error: () => this.toastr.error('Erro ao carregar comunicados')
    });
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.loadInternalAnnouncement(page);
    }
  }

  showInternalAnnouncementForm(internalAnnouncementId?: number): void {
    this.isEdit = !!internalAnnouncementId;
    this.modalTitle = this.isEdit ? 'Editar Comunicado' : 'Novo Comunicado';

    if (internalAnnouncementId) {
      this.internalAnnouncementService.getById(internalAnnouncementId).subscribe({
        next: (internalAnnouncement) => {
          this.internalAnnouncementForm = { ...internalAnnouncement };
          this.quillContent = internalAnnouncement.content || '';
          this.openModal();
        },
        error: () => this.toastr.error('Erro ao carregar comunicado')
      });
    } else {
      this.internalAnnouncementForm = this.getEmptyInternalAnnouncement();
      this.quillContent = '';
      this.openModal();
    }
  }

  setDate(dateType: string, value: string | null) {
    if (dateType === 'publishDate')
      this.internalAnnouncementForm.publishDate = value ? new Date(value) : new Date();
    else
      this.internalAnnouncementForm.expirationDate = value ? new Date(value) : new Date();
  }

  saveInternalAnnouncement(): void {
    const formData = new FormData();
    formData.append('title', this.internalAnnouncementForm.title);
    formData.append('content', this.quillContent);
    formData.append('publishDate', new Date(this.internalAnnouncementForm.publishDate).toISOString().split('T')[0]);
    if (this.internalAnnouncementForm.expirationDate) {
      formData.append('expirationDate', new Date(this.internalAnnouncementForm.expirationDate).toISOString());
    }
    formData.append('isActive', this.internalAnnouncementForm.isActive.toString());
    formData.append('userId', this.internalAnnouncementForm.userId.toString());

    const request = this.isEdit && this.internalAnnouncementForm?.id
      ? this.internalAnnouncementService.update(this.internalAnnouncementForm.id, formData)
      : this.internalAnnouncementService.create(formData);

    request.subscribe({
      next: () => {
        this.closeModal();
        this.loadInternalAnnouncement(this.currentPage);
        this.toastr.success('Comunicado salvo com sucesso!');
      },
      error: () => this.toastr.error('Erro ao salvar comunicado')
    });
  }

  deleteInternalAnnouncement(id?: number): void {
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
        this.internalAnnouncementService.delete(id).subscribe({
          next: () => {
            this.loadInternalAnnouncement(this.currentPage);
            this.toastr.success('Comunicado excluído com sucesso');
          },
          error: () => this.toastr.error('Erro ao excluir comunicado')
        });
      }
    });
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.quillContent = '';
  }

  canSave(): boolean {
    return this.internalAnnouncementForm.title.trim().length > 0 && this.quillContent.trim().length > 0;
  }
}
