import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';

import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2/dist/sweetalert2.esm.all.js';
import { Benefit, BenefitInput } from '../../../models/benefit.model';
import { BenefitService } from '../../../core/services/benefit.service';

@Component({
  selector: 'app-benefits-admin',
  imports: [FormsModule],
  templateUrl: './benefits-admin.component.html',
  styleUrls: ['./benefits-admin.component.css']
})
export class BenefitsAdminComponent implements OnInit {
  benefits: Benefit[] = [];
  search = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  publishingId: number | null = null;
  loading = false;
  loadError = false;
  saving = false;
  deletingId: number | null = null;
  editingId: number | null = null;
  showForm = false;
  private dialogTrigger: HTMLElement | null = null;
  @ViewChild('benefitDialog') set benefitDialog(dialog: ElementRef<HTMLElement> | undefined) {
    if (dialog) dialog.nativeElement.querySelector<HTMLInputElement>('#benefit-title')?.focus();
    else this.dialogTrigger?.focus();
  }
  data: BenefitInput = this.empty();
  constructor(private service: BenefitService, private toastr: ToastrService) {}
  ngOnInit(): void { this.load(); }
  private empty(): BenefitInput { return { title: '', description: '', category: '', eligibility: '', howToAccess: '', link: '', isActive: true }; }
  get filtered(): Benefit[] {
    const term = this.search.trim().toLocaleLowerCase('pt-BR');
    return this.benefits.filter(b =>
      (this.statusFilter === 'all' || b.isActive === (this.statusFilter === 'active')) &&
      `${b.title} ${b.category} ${b.description}`.toLocaleLowerCase('pt-BR').includes(term));
  }
  get activeCount(): number { return this.benefits.filter(b => b.isActive).length; }
  load(): void {
    this.loading = true;
    this.loadError = false;
    this.service.getAdmin().pipe(finalize(() => this.loading = false)).subscribe({
      next: data => this.benefits = data,
      error: () => { this.loadError = true; this.toastr.error('Erro ao carregar benefícios.'); }
    });
  }
  edit(benefit?: Benefit): void {
    this.dialogTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.editingId = benefit?.id ?? null;
    this.data = benefit ? { title: benefit.title, description: benefit.description, category: benefit.category, eligibility: benefit.eligibility, howToAccess: benefit.howToAccess, link: benefit.link, isActive: benefit.isActive } : this.empty();
    this.showForm = true;
  }
  cancel(): void { if (!this.saving) this.showForm = false; }
  togglePublication(benefit: Benefit): void {
    if (this.publishingId !== null || this.deletingId !== null || this.showForm) return;
    const { id, ...input } = benefit;
    const isActive = !benefit.isActive;
    this.publishingId = id;
    this.service.update(id, { ...input, isActive }).pipe(finalize(() => this.publishingId = null)).subscribe({
      next: () => {
        benefit.isActive = isActive;
        this.toastr.success(isActive ? 'Benefício publicado.' : 'Publicação do benefício removida.');
      },
      error: () => this.toastr.error('Erro ao alterar a publicação do benefício.')
    });
  }
  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.cancel(); return; }
    if (event.key !== 'Tab') return;
    const dialog = event.currentTarget as HTMLElement;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button, input, textarea, [tabindex="0"]'))
      .filter(control => !control.matches(':disabled') && control.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); dialog.focus(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
  save(form: NgForm): void {
    if (this.saving || form.invalid) { form.control.markAllAsTouched(); return; }
    const input = { ...this.data, title: this.data.title.trim(), description: this.data.description.trim(), link: this.data.link?.trim() || null };
    if (!input.title || !input.description) { this.toastr.error('Preencha o nome e a descrição do benefício.'); return; }
    if (input.link) {
      try { if (!['https:', 'http:'].includes(new URL(input.link).protocol)) throw new Error(); }
      catch { this.toastr.error('Informe um link HTTP ou HTTPS válido.'); return; }
    }
    this.saving = true;
    const request = this.editingId === null ? this.service.create(input) : this.service.update(this.editingId, input);
    request.pipe(finalize(() => this.saving = false)).subscribe({
      next: () => { this.showForm = false; this.load(); this.toastr.success('Benefício salvo com sucesso!'); },
      error: () => this.toastr.error('Erro ao salvar benefício. Revise os campos e tente novamente.')
    });
  }
  async remove(benefit: Benefit): Promise<void> {
    if (this.deletingId !== null) return;
    const result = await Swal.fire({ title: 'Excluir benefício?', text: `O benefício “${benefit.title}” será excluído permanentemente.`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Excluir', cancelButtonText: 'Cancelar' });
    if (!result.isConfirmed || this.deletingId !== null) return;
    this.deletingId = benefit.id;
    this.service.delete(benefit.id).pipe(finalize(() => this.deletingId = null)).subscribe({
      next: () => { this.load(); this.toastr.success('Benefício excluído.'); },
      error: () => this.toastr.error('Erro ao excluir benefício.')
    });
  }
}
