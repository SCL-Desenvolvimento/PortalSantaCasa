import { Component, OnInit } from '@angular/core';
import { Birthday } from '../../../models/birthday.model';
import { BirthdayService } from '../../../services/birthday.service';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-birthdays',
  standalone: false,
  templateUrl: './birthdays.component.html',
  styleUrls: ['./birthdays.component.css']
})
export class BirthdaysComponent implements OnInit {
  // =====================
  // 📌 Dados principais
  // =====================
  birthdaysList: Birthday[] = [];
  filteredBirthdays: Birthday[] = [];

  totalBirthdays = 0;
  activeBirthdays = 0;
  inactiveBirthdays = 0;

  // Filtros e busca
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  // Modal
  modalTitle = '';
  showModal = false;
  isEdit = false;
  isLoading = false;

  // Dados do formulário
  birthdayForm: Birthday = this.getEmptyBirthday();
  selectedBirthday: Birthday | null = null;
  imageFile: File | null = null;
  birthDateFormatted: string = '';

  // Paginação
  currentPage = 1;
  perPage = 10;
  totalPages = 0;

  constructor(
    private birthdayService: BirthdayService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadBirthdays();
  }

  private getEmptyBirthday(): Birthday {
    return {
      id: 0,
      name: '',
      birthDate: new Date(),
      department: '',
      position: '',
      photoUrl: '',
      isActive: true,
      createdAt: new Date()
    };
  }

  // =====================
  // 📌 CRUD
  // =====================
  loadBirthdays(page: number = 1): void {
    this.birthdayService.getBirthdaysPaginated(page, this.perPage).subscribe({
      next: (data) => {
        this.birthdaysList = data.birthdays.map(b => ({
          ...b,
          photoUrl: b.photoUrl ? `${environment.imageServerUrl}${b.photoUrl}` : ''
        }));

        this.updateStatistics();

        this.currentPage = data.currentPage;
        this.perPage = data.perPage;
        this.totalPages = data.pages;

        this.applyFilters();
      },
      error: () => this.toastr.error('Erro ao carregar aniversariantes')
    });
  }

  private updateStatistics(): void {
    this.totalBirthdays = this.birthdaysList.length;
    this.activeBirthdays = this.birthdaysList.filter(b => b.isActive).length;
    this.inactiveBirthdays = this.totalBirthdays - this.activeBirthdays;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      this.imageFile = input.files[0];
    }
  }

  saveBirthday(): void {
    if (!this.canSave()) return;

    this.isLoading = true;

    const formData = new FormData();
    formData.append('name', this.birthdayForm.name);
    formData.append('birthDate', this.birthDateFormatted);
    formData.append('department', this.birthdayForm.department || '');
    formData.append('position', this.birthdayForm.position || '');
    formData.append('isActive', String(this.birthdayForm.isActive));

    if (this.imageFile) {
      formData.append('file', this.imageFile, this.imageFile.name);
    }

    const request = this.isEdit && this.selectedBirthday?.id
      ? this.birthdayService.updateBirthday(this.selectedBirthday.id, formData)
      : this.birthdayService.createBirthday(formData);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.closeModal();
        this.loadBirthdays(this.currentPage);
        this.toastr.success('Aniversariante salvo com sucesso!');
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Erro ao salvar aniversariante');
      }
    });
  }

  deleteBirthday(id?: number): void {
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
        this.birthdayService.deleteBirthday(id).subscribe({
          next: () => {
            this.loadBirthdays(this.currentPage);
            this.toastr.success('Aniversariante removido com sucesso');
          },
          error: () => this.toastr.error('Erro ao excluir aniversariante')
        });
      }
    });
  }

  toggleBirthdayStatus(birthday: Birthday): void {
    if (!birthday.id) return;

    const newStatus = !birthday.isActive;
    const formData = new FormData();
    formData.append('name', birthday.name);
    formData.append('birthDate', this.formatDate(birthday.birthDate));
    formData.append('department', birthday.department || '');
    formData.append('position', birthday.position || '');
    formData.append('isActive', String(newStatus));

    this.birthdayService.updateBirthday(birthday.id, formData).subscribe({
      next: () => {
        birthday.isActive = newStatus;
        this.updateStatistics();
        this.applyFilters();
        this.toastr.success(`Status atualizado para ${newStatus ? 'Ativo' : 'Inativo'}`);
      },
      error: () => this.toastr.error('Erro ao atualizar status')
    });
  }

  // =====================
  // 📌 Modal
  // =====================
  showBirthdayModal(birthdayId?: number): void {
    this.isEdit = !!birthdayId;
    this.modalTitle = this.isEdit ? 'Editar Aniversariante' : 'Novo Aniversariante';

    if (birthdayId) {
      this.birthdayService.getBirthdayById(birthdayId).subscribe({
        next: (birthday) => {
          this.selectedBirthday = birthday;
          this.birthdayForm = {
            ...birthday,
            photoUrl: birthday.photoUrl ? `${environment.imageServerUrl}${birthday.photoUrl}` : ''
          };
          this.birthDateFormatted = this.formatDate(birthday.birthDate);
          this.openModal();
        },
        error: () => this.toastr.error('Erro ao carregar aniversariante')
      });
    } else {
      this.selectedBirthday = null;
      this.birthdayForm = this.getEmptyBirthday();
      this.imageFile = null;
      this.birthDateFormatted = this.formatDate(new Date());
      this.openModal();
    }
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.birthdayForm = this.getEmptyBirthday();
    this.isEdit = false;
    this.isLoading = false;
    this.imageFile = null;
    this.birthDateFormatted = '';
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
    this.filteredBirthdays = this.birthdaysList.filter(birthday => {
      const matchesSearch =
        !this.searchTerm ||
        birthday.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        birthday?.department?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        birthday?.position?.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && birthday.isActive) ||
        (this.statusFilter === 'inactive' && !birthday.isActive);

      return matchesSearch && matchesStatus;
    });
  }

  // =====================
  // 📌 Paginação
  // =====================
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.loadBirthdays(page);
    }
  }

  // =====================
  // 📌 Helpers
  // =====================
  canSave(): boolean {
    return !!this.birthdayForm.name && !!this.birthDateFormatted;
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }
}


