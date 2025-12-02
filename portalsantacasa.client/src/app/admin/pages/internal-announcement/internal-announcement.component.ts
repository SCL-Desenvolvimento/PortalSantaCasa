import { Component, OnInit } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/services/auth.service';
import { InternalAnnouncementService } from '../../../core/services/internal-announcement.service';
import { InternalAnnouncement } from '../../../models/internal-announcement.model';

@Component({
  selector: 'app-internal-announcement',
  standalone: false,
  templateUrl: './internal-announcement.component.html',
  styleUrls: ['./internal-announcement.component.css']
})
export class InternalAnnouncementComponent implements OnInit {

  // =====================
  // 📌 Dados principais
  // =====================
  internals: InternalAnnouncement[] = [];
  filteredInternals: InternalAnnouncement[] = [];

  totalInternals = 0;
  activeInternals = 0;
  inactiveInternals = 0;

  quillContent = '';
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


  publishDateFormatted = '';
  expirationDateFormatted = '';
  isEdit = false;
  isLoading = false;

  modalTitle = '';
  showModal = false;

  internalData!: InternalAnnouncement;

  // Filtros e busca
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  // Paginação
  currentPage = 1;
  perPage = 12;
  totalPages = 0;

  constructor(
    private internalService: InternalAnnouncementService,
    private authService: AuthService,
    private toastr: ToastrService
  ) { }

  // =====================
  // 📌 Inicialização
  // =====================
  ngOnInit(): void {
    this.internalData = this.getEmptyInternal();
    this.loadInternals();
  }

  onContentChanged(event: any) {
    this.internalData.content = event.html;
  }

  private getEmptyInternal(): InternalAnnouncement {
    return {
      id: 0,
      title: '',
      content: '',
      publishDate: new Date(),
      isActive: true,
      showMask: false,
      expirationDate: new Date(),
      userId: this.authService.getUserInfo('id') ?? 0,
      userName: ''
    };
  }

  // =====================
  // 📌 Carregar comunicados
  // =====================
  loadInternals(page: number = 1): void {
    this.internalService.getPaginated(page, this.perPage).subscribe({
      next: (res) => {
        this.internals = res.items;
        this.filteredInternals = [...this.internals];

        this.currentPage = res.currentPage;
        this.totalPages = res.totalPages;

        this.totalInternals = res.totalCount;
        this.activeInternals = res.items.filter(n => n.isActive).length;
        this.inactiveInternals = res.items.filter(n => !n.isActive).length;

        this.applyFilters();
      },
      error: () => this.toastr.error('Erro ao carregar comunicados internos')
    });
    this.loadTotals();
  }

  // =====================
  // 📌 Paginação
  // =====================
  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.loadInternals(page);
  }

  // =====================
  // 📌 Busca e Filtros
  // =====================
  onSearch(): void {
    this.applyFilters();
  }

  setStatusFilter(filter: 'all' | 'active' | 'inactive') {
    this.statusFilter = filter;

    this.internalService.getPaginated(1, this.perPage, filter).subscribe({
      next: (res) => {
        this.internals = res.items;

        this.filteredInternals = [...this.internals];
        this.currentPage = 1;
        this.totalPages = res.totalPages
      },
      error: () => this.toastr.error('Erro ao carregar comunicados internos')
    });
  }

  applyFilters(): void {
    let list = [...this.internals];

    // Filtro de texto
    if (this.searchTerm.trim()) {
      list = list.filter(n =>
        n.title.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Filtro de status
    if (this.statusFilter === 'active') {
      list = list.filter(n => n.isActive);
    } else if (this.statusFilter === 'inactive') {
      list = list.filter(n => !n.isActive);
    }

    this.filteredInternals = list;
  }

  // =====================
  // 📌 Modal
  // =====================
  showInternalModal(id?: number): void {
    this.isEdit = !!id;
    this.modalTitle = this.isEdit ? 'Editar Comunicado Interno' : 'Novo Comunicado Interno';

    if (id) {
      this.internalService.getById(id).subscribe({
        next: (internal) => {
          this.internalData = { ...internal };
          this.quillContent = internal.content || '';
          this.publishDateFormatted = this.formatDateToInput(internal.publishDate);
          this.expirationDateFormatted = internal.expirationDate ? this.formatDateToInput(internal.expirationDate) : '';
          this.showModal = true;
        },
        error: () => this.toastr.error('Erro ao carregar comunicado')
      });
    } else {
      this.internalData = this.getEmptyInternal();
      this.quillContent = '';
      this.publishDateFormatted = this.formatDateToInput(new Date());
      this.expirationDateFormatted = '';
      this.showModal = true;
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.quillContent = '';
  }

  // =====================
  // 📌 Salvar comunicado
  // =====================
  saveInternal(): void {
    if (!this.internalData.title || !this.quillContent || !this.publishDateFormatted) {
      this.toastr.warning('Preencha todos os campos obrigatórios');
      return;
    }

    this.isLoading = true;

    // Atualiza a model localmente antes de enviar (opcional, mas bom para consistência)
    this.internalData.publishDate = new Date(this.publishDateFormatted);
    if (this.expirationDateFormatted) {
      this.internalData.expirationDate = new Date(this.expirationDateFormatted);
    } else {
      this.internalData.expirationDate = undefined;
    }

    const formData = new FormData();
    formData.append('title', this.internalData.title);
    formData.append('content', this.quillContent);
    formData.append('isActive', this.internalData.isActive.toString());
    formData.append('userId', this.internalData.userId.toString());

    // Envia as datas formatadas para o backend
    formData.append('publishDate', this.publishDateFormatted);
    if (this.expirationDateFormatted) {
      formData.append('expirationDate', this.expirationDateFormatted);
    }

    const request = this.isEdit && this.internalData.id
      ? this.internalService.update(this.internalData.id, formData)
      : this.internalService.create(formData);

    request.subscribe({
      next: () => {
        this.toastr.success('Comunicado salvo com sucesso!');
        this.closeModal();
        this.loadInternals(this.currentPage);
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Erro ao salvar');
        this.isLoading = false;
      }
    });
  }

  // =====================
  // 📌 Alterar status
  // =====================
  toggleInternalStatus(internal: InternalAnnouncement): void {
    const internalStatus = !internal.isActive;
    const formData = new FormData();
    formData.append('title', this.internalData.title);
    formData.append('content', this.quillContent);
    formData.append('isActive', this.internalData.isActive.toString());
    formData.append('userId', this.internalData.userId.toString());

    // Envia as datas formatadas para o backend
    formData.append('publishDate', this.publishDateFormatted);
    if (this.expirationDateFormatted) {
      formData.append('expirationDate', this.expirationDateFormatted);
    }

    if (!internal.id)
      return;

    this.internalService.update(internal.id, formData).subscribe({
      next: () => {
        internal.isActive = internalStatus;
        this.loadTotals(); // Atualiza as estatísticas após a mudança de status
        this.applyFilters();
        this.toastr.success(`Status atualizado para ${internalStatus ? 'Ativa' : 'Inativa'}`);
      },
      error: () => this.toastr.error('Erro ao atualizar status')
    });
  }

  loadTotals(): void {
    this.internalService.getInternalTotals().subscribe({
      next: (data) => {
        this.totalInternals = data.totalInternal;
        this.activeInternals = data.activeInternal;
        this.inactiveInternals = data.inactiveInternal;
      },
      error: () => this.toastr.error('Erro ao carregar totais de notícias')
    });
  }

  // =====================
  // 📌 Excluir comunicado
  // =====================
  deleteInternal(id?: number): void {
    if (!id) return;

    Swal.fire({
      title: 'Tem certeza?',
      text: 'Esta ação não pode ser desfeita!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.internalService.delete(id).subscribe({
          next: () => {
            this.toastr.success('Comunicado excluído');
            this.loadInternals(this.currentPage);
          },
          error: () => this.toastr.error('Erro ao excluir')
        });
      }
    });
  }

  // =====================
  // 📌 Formatadores
  // =====================
  formatDateToInput(date: Date | string): string {
    if (!date) return '';
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

  getInternalDay(date: Date | string): string {
    return new Date(date).getDate().toString().padStart(2, '0');
  }

  getInternalMonth(date: Date | string): string {
    return new Date(date).toLocaleString('pt-BR', { month: 'short' }).toUpperCase();
  }
}
