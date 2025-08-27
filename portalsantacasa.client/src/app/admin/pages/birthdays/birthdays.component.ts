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
  styleUrl: './birthdays.component.css'
})
export class BirthdaysComponent implements OnInit {
  birthdays: Birthday[] = [];
  modalTitle = '';
  showModal = false;
  isEdit = false;
  selectedBirthday: Birthday | null = null;
  birthdayForm: Birthday = this.getEmptyBirthday();
  imageFile: File | null = null;
  // paginação
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

  loadBirthdays(page: number = 1): void {
    this.birthdayService.getBirthdaysPaginated(page, this.perPage).subscribe({
      next: (data) => {
        this.currentPage = data.currentPage;
        this.perPage = data.perPage;
        this.totalPages = data.pages;

        this.birthdays = data.birthdays.map(b => ({
          ...b,
          photoUrl: b.photoUrl ? `${environment.imageServerUrl}${b.photoUrl}` : ''
        }));
      },
      error: () => this.toastr.error('Erro ao carregar aniversariantes')
    });
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.loadBirthdays(page);
    }
  }

  showBirthdayForm(birthdayId?: number): void {
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
          this.openModal();
        },
        error: () => this.toastr.error('Erro ao carregar aniversariante')
      });
    } else {
      this.selectedBirthday = null;
      this.birthdayForm = this.getEmptyBirthday();
      this.imageFile = null;
      this.openModal();
    }
  }

  saveBirthday(): void {
    const formData = new FormData();
    console.log(this.birthdayForm.birthDate);
    formData.append('name', this.birthdayForm.name);
    formData.append('birthDate', new Date(this.birthdayForm.birthDate).toISOString().split('T')[0]);
    formData.append('department', this.birthdayForm.department || '');
    formData.append('position', this.birthdayForm.position || '');
    formData.append('isActive', this.birthdayForm.isActive.toString());

    if (this.imageFile) {
      formData.append('file', this.imageFile, this.imageFile.name);
    }

    const request = this.isEdit && this.selectedBirthday?.id
      ? this.birthdayService.updateBirthday(this.selectedBirthday.id, formData)
      : this.birthdayService.createBirthday(formData);

    request.subscribe({
      next: () => {
        this.closeModal();
        this.loadBirthdays(this.currentPage);
        this.toastr.success('Aniversariante salvo com sucesso!');
      },
      error: () => this.toastr.error('Erro ao salvar aniversariante')
    });
  }

  deleteBirthday(id: number | undefined): void {
    if (!id)
      return

    Swal.fire({
      title: 'Tem certeza?',
      text: 'Você não poderá reverter esta ação!',
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
      return !!this.birthdayForm.photoUrl || !!this.imageFile;
    }
    return !!this.imageFile;
  }
}
