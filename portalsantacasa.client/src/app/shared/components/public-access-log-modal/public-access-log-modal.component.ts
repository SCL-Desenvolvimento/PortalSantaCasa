import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PublicAccessLogService } from '../../../core/services/public-access-log.service';
import { PublicAccessLogCreate } from '../../../models/public-access-log.model';
import { PointsService } from '../../../core/services/points.service';

@Component({
  selector: 'app-public-access-log-modal',
  standalone: false,
  templateUrl: './public-access-log-modal.component.html',
  styleUrl: './public-access-log-modal.component.css'
})
export class PublicAccessLogModalComponent {
  @Input() page = '';
  @Input() isOpen = false;
  @Output() registered = new EventEmitter<void>();

  form: PublicAccessLogCreate = this.getEmptyForm();
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private publicAccessLogService: PublicAccessLogService,
    private pointsService: PointsService
  ) { }

  submit(): void {
    this.errorMessage = '';

    if (!this.form.name.trim() || !this.form.re.trim() || !this.form.sector.trim() || !this.page.trim()) {
      this.errorMessage = 'Preencha Nome, RE e Setor para continuar.';
      return;
    }

    this.isSubmitting = true;

    this.publicAccessLogService.create({
      name: this.form.name.trim(),
      re: this.form.re.trim(),
      sector: this.form.sector.trim(),
      page: this.page.trim()
    }).subscribe({
      next: () => {
        this.pointsService.saveIdentity({
          name: this.form.name.trim(),
          re: this.form.re.trim(),
          sector: this.form.sector.trim()
        });

        this.isSubmitting = false;
        this.form = this.getEmptyForm();
        this.registered.emit();
      },
      error: (error) => {
        this.isSubmitting = false;
        this.errorMessage = error.message || 'Nao foi possivel registrar o acesso.';
      }
    });
  }

  private getEmptyForm(): PublicAccessLogCreate {
    return {
      name: '',
      re: '',
      sector: '',
      page: ''
    };
  }
}
