import { Component, OnInit } from '@angular/core';
import { Birthday } from '../../../models/birthday.model';
import { BirthdayService } from '../../../services/birthday.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-birthdays',
  standalone: false,
  templateUrl: './birthdays.component.html',
  styleUrl: './birthdays.component.css'
})
export class BirthdaysComponent implements OnInit {
  birthdays: Birthday[] = [];
  modalTitle: string = '';
  showModal: boolean = false;
  isEdit: boolean = false;
  selectedBirthday: Birthday | null = null;
  birthdayForm: Birthday = { name: '', birthDate: new Date(), isActive: true, createdAt: new Date() };
  photoFile: File | null = null;
  message: { text: string, type: string } | null = null;

  constructor(private birthdayService: BirthdayService) { }

  ngOnInit(): void {
    this.loadBirthdaysAdmin();
  }

  loadBirthdaysAdmin(): void {
    this.birthdayService.getBirthdays().subscribe({
      next: (data) => {
        this.birthdays = data.map((birthday) => ({
          id: birthday.id,
          birthDate: birthday.birthDate,
          createdAt: birthday.createdAt,
          isActive: birthday.isActive,
          name: birthday.name,
          department: birthday.department,
          photoUrl: `${environment.imageServerUrl}${birthday.photoUrl}`,
          position: birthday.position
        }));
      },
      error: (error) => {
        this.showMessage(`Erro ao carregar aniversariantes: ${error.message}`, 'error');
      }
    });
  }

  showBirthdayForm(birthdayId: number | null = null): void {
    this.isEdit = birthdayId !== null;
    this.modalTitle = this.isEdit ? 'Editar Aniversariante' : 'Novo Aniversariante';
    if (birthdayId) {
      this.birthdayService.getBirthdayById(birthdayId).subscribe({
        next: (birthday) => {
          this.selectedBirthday = birthday;
          this.birthdayForm = { ...birthday, photoUrl: `${environment.imageServerUrl}${birthday.photoUrl}` };
          this.openModal();
        },
        error: (error) => {
          this.showMessage(`Erro ao carregar aniversariante: ${error.message}`, 'error');
        }
      });
    } else {
      this.selectedBirthday = null;
      this.birthdayForm = { name: '', birthDate: new Date(), isActive: true, createdAt: new Date() };
      this.photoFile = null;
      this.openModal();
    }
  }

  saveBirthday(): void {
    const formData = new FormData();
    formData.append('name', this.birthdayForm.name);
    formData.append('birthDate', this.birthdayForm.birthDate.toString());
    formData.append('department', this.birthdayForm.department || '');
    formData.append('position', this.birthdayForm.position || '');
    formData.append('isActive', this.birthdayForm.isActive.toString());
    if (this.photoFile) {
      formData.append('photoUrl', this.photoFile, this.photoFile.name);
    }

    this.submitBirthdayForm(formData);
  }

  submitBirthdayForm(formData: FormData): void {
    const request = this.isEdit && this.selectedBirthday?.id
      ? this.birthdayService.updateBirthday(this.selectedBirthday.id, formData)
      : this.birthdayService.createBirthday(formData);
    request.subscribe({
      next: (data) => {
        this.closeModal();
        //this.showMessage(data.message, 'success');
        this.loadBirthdaysAdmin();
      },
      error: (error) => {
        this.showMessage(error.message || 'Erro ao salvar aniversariante', 'error');
      }
    });
  }

  deleteBirthday(birthdayId?: number): void {
    if (!birthdayId) {
      console.warn('ID inválido ao tentar deletar aniversário.');
      return;
    }

    if (confirm('Tem certeza que deseja excluir este aniversariante?')) {
      this.birthdayService.deleteBirthday(birthdayId).subscribe({
        next: (data) => {
          //this.showMessage(data.message, 'success');
          this.loadBirthdaysAdmin();
        },
        error: (error) => {
          this.showMessage(error.message || 'Erro ao excluir aniversariante', 'error');
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
      if (type === 'photo') {
        this.photoFile = input.files[0];
      }
    }
  }
}
