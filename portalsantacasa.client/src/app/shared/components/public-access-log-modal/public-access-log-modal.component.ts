import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { PublicAccessLogService } from '../../../core/services/public-access-log.service';
import { PublicAccessLogCreate } from '../../../models/public-access-log.model';
import { PointsService } from '../../../core/services/points.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-public-access-log-modal',
  standalone: false,
  templateUrl: './public-access-log-modal.component.html',
  styleUrl: './public-access-log-modal.component.css'
})
export class PublicAccessLogModalComponent implements OnInit {
  @Input() page = '';
  @Input() isOpen = false;
  @Output() registered = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  form: PublicAccessLogCreate = this.getEmptyForm();
  departments: string[] = [];
  isLoadingDepartments = false;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private publicAccessLogService: PublicAccessLogService,
    private pointsService: PointsService,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.loadDepartments();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  close(): void {
    this.errorMessage = '';
    this.form = this.getEmptyForm();
    this.closed.emit();
  }

  submit(): void {
    this.errorMessage = '';

    if (!this.form.name.trim() || !this.form.re.trim() || !this.form.sector.trim() || !this.page.trim()) {
      this.errorMessage = 'Preencha Nome, RE e Setor para continuar.';
      return;
    }

    if (!this.departments.includes(this.form.sector.trim())) {
      this.errorMessage = 'Selecione um setor válido para continuar.';
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

  private loadDepartments(): void {
    this.isLoadingDepartments = true;

    this.userService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
        this.isLoadingDepartments = false;
      },
      error: () => {
        this.departments = [];
        this.isLoadingDepartments = false;
        this.errorMessage = 'Não foi possível carregar a lista de setores.';
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
