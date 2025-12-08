import { Component, OnInit } from '@angular/core';
import { FormsService } from '../../../core/services/forms.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { FormsResponseDto } from '../../../models/forms.model';

@Component({
  selector: 'app-forms-register',
  standalone: false,
  templateUrl: './forms-register.component.html',
  styleUrls: ['./forms-register.component.css'],
})
export class FormsRegisterComponent implements OnInit {
  formsList: FormsResponseDto[] = [];
  filteredForms: FormsResponseDto[] = [];
  totalForms = 0;
  searchTerm = '';
  showModal = false;
  modalTitle = '';
  isEdit = false;
  isLoading = false;
  formsData: FormsResponseDto = this.getEmptyForms();

  constructor(
    private formsService: FormsService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadForms();
  }

  private getEmptyForms(): FormsResponseDto {
    return {
      id: 0,
      title: '',
      description: '',
      formsLink: '',
    };
  }

  loadForms(): void {
    this.formsService.getAll().subscribe({
      next: (data) => {
        this.formsList = data;
        this.totalForms = data.length;
        this.applyFilters();
      },
      error: () => this.toastr.error('Erro ao carregar formulários'),
    });
  }

  onSearch(): void {
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredForms = this.formsList.filter(f =>
      !this.searchTerm ||
      f.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      (f.description || '').toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  showFormsModal(id?: number): void {
    this.isEdit = !!id;
    this.modalTitle = this.isEdit ? 'Editar Formulário' : 'Novo Formulário';

    if (id) {
      const form = this.formsList.find(f => f.id === id);
      if (form) this.formsData = { ...form };
    } else {
      this.formsData = this.getEmptyForms();
    }

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.formsData = this.getEmptyForms();
    this.isEdit = false;
    this.isLoading = false;
  }

  saveForms(): void {
    this.isLoading = true;

    const request = this.isEdit
      ? this.formsService.update(this.formsData.id, this.formsData)
      : this.formsService.create(this.formsData);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.closeModal();
        this.loadForms();
        this.toastr.success('Formulário salvo com sucesso!');
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Erro ao salvar formulário');
      },
    });
  }

  deleteForms(id: number): void {
    Swal.fire({
      title: 'Tem certeza?',
      text: 'Esta ação não pode ser desfeita!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        this.formsService.delete(id).subscribe({
          next: () => {
            this.loadForms();
            this.toastr.success('Formulário excluído com sucesso!');
          },
          error: () => this.toastr.error('Erro ao excluir formulário'),
        });
      }
    });
  }
}
