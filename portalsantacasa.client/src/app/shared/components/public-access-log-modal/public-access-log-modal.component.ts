import { Component, EventEmitter, HostListener, Input, Output, OnDestroy } from '@angular/core';
import { PublicAccessLogService } from '../../../core/services/public-access-log.service';
import { PublicAccessLogCreate } from '../../../models/public-access-log.model';
import { PointsService } from '../../../core/services/points.service';
import { Subscription, timeout, TimeoutError } from 'rxjs';

@Component({
  selector: 'app-public-access-log-modal',
  standalone: false,
  templateUrl: './public-access-log-modal.component.html',
  styleUrl: './public-access-log-modal.component.css'
})
export class PublicAccessLogModalComponent implements OnDestroy {
  @Input() page = '';
  @Input() contentId?: number;
  @Input() contentTitle = '';
  @Input() isOpen = false;
  @Output() registered = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  form: PublicAccessLogCreate = this.getEmptyForm();
  isLookingUp = false;
  employeeFound = false;
  manualEntry = false;
  private lookupSubscription?: Subscription;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private publicAccessLogService: PublicAccessLogService,
    private pointsService: PointsService
  ) { }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  close(): void {
    this.cancelLookup();
    this.errorMessage = '';
    this.form = this.getEmptyForm();
    this.closed.emit();
  }

  ngOnDestroy(): void { this.cancelLookup(); }

  onChapaChange(): void {
    this.cancelLookup();
    this.form.name = '';
    this.form.sector = '';
    this.errorMessage = '';
  }

  lookupEmployee(): void {
    if (this.isSubmitting) return;
    const chapa = this.form.re.trim();
    if ((this.employeeFound || this.manualEntry) && chapa === this.form.re) return;
    this.onChapaChange();
    if (!chapa) return;
    if (!/^[0-9]{1,50}$/.test(chapa)) {
      this.errorMessage = 'Informe uma chapa válida, somente com números.';
      return;
    }
    this.isLookingUp = true;
    this.lookupSubscription = this.publicAccessLogService.getEmployee(chapa).pipe(timeout(35000)).subscribe({
      next: employee => {
        if (!employee || typeof employee.re !== 'string' || !employee.re.trim() ||
            typeof employee.name !== 'string' || !employee.name.trim() ||
            typeof employee.sector !== 'string' || !employee.sector.trim() || employee.re.trim() !== chapa) {
          this.isLookingUp = false;
          this.manualEntry = true;
          this.errorMessage = 'O RH retornou dados inválidos. Preencha nome e setor manualmente.';
          return;
        }
        this.form.re = employee.re;
        this.form.name = employee.name;
        this.form.sector = employee.sector;
        this.employeeFound = true;
        this.isLookingUp = false;
      },
      error: error => {
        this.isLookingUp = false;
        const message = error instanceof TimeoutError
          ? 'A consulta ao RH demorou mais que o esperado.'
          : error?.message || 'Não foi possível consultar o RH.';
        this.manualEntry = error instanceof TimeoutError || error?.status === 0 || error?.status >= 500;
        this.errorMessage = this.manualEntry
          ? `${message} Preencha nome e setor manualmente.`
          : `${message} Confira a chapa e saia do campo para tentar novamente.`;
      }
    });
  }

  private cancelLookup(): void {
    this.lookupSubscription?.unsubscribe();
    this.isLookingUp = false;
    this.employeeFound = false;
    this.manualEntry = false;
  }

  submit(): void {
    if (this.isSubmitting || this.isLookingUp) return;
    this.errorMessage = '';

    if ((!this.employeeFound && !this.manualEntry) || !this.form.name.trim() || !this.form.re.trim() || !this.form.sector.trim() || !this.page.trim()) {
      this.errorMessage = this.manualEntry ? 'Preencha nome e setor para continuar.' : 'Informe uma chapa válida e saia do campo para continuar.';
      return;
    }

    this.isSubmitting = true;

    this.publicAccessLogService.create({
      name: this.form.name.trim(),
      re: this.form.re.trim(),
      sector: this.form.sector.trim(),
      page: this.page.trim(),
      contentId: this.contentId,
      contentTitle: this.contentTitle.trim() || undefined
    }).subscribe({
      next: log => {
        this.pointsService.saveIdentity({
          name: log.name,
          re: log.re,
          sector: log.sector
        });

        this.isSubmitting = false;
        this.cancelLookup();
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
      page: '',
      contentId: undefined,
      contentTitle: undefined
    };
  }
}
