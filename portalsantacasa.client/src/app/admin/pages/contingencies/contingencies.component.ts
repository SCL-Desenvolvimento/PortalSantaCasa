import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DEPARTMENTS } from '../../../shared/constants/departments.constants';

type Status = 'investigating' | 'monitoring' | 'resolved';

interface Contingency {
  id: number;
  system: string;
  departments: string[];
  extension: string;
  procedure: string;
  status: Status;
  nextUpdateAt: string | null;
  revision: number;
  updates: { status: Status; message: string; author: string; createdAt: string }[];
}

interface ContingencyInput {
  system: string;
  departments: string[];
  extension: string;
  procedure: string;
  status: Status;
  revision: number;
  message: string;
  nextUpdateAt: string;
}

@Component({
  selector: 'app-contingencies',
  imports: [DatePipe, FormsModule, NgSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contingencies.component.html',
  styleUrls: ['../../styles/staff-operations.css', './contingencies.component.css']
})
export class ContingenciesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly url = `${environment.apiUrl}/contingencies`;

  readonly statuses: Record<Status, string> = {
    investigating: 'Em investigação', monitoring: 'Em monitoramento', resolved: 'Resolvido'
  };
  readonly departments = ['Todos os setores', ...DEPARTMENTS];
  readonly incidents = signal<Contingency[]>([]);
  readonly canPublish = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly saved = signal('');
  readonly editor = signal<{ id: number | null; input: ContingencyInput } | null>(null);
  includeResolved = false;

  @ViewChild('incidentFocus') set incidentFocus(field: ElementRef<HTMLElement> | undefined) {
    field?.nativeElement.focus();
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.error.set('');
    this.loading.set(true);
    this.http.get<{ items: Contingency[]; canPublish: boolean }>(this.url, { params: { includeResolved: this.includeResolved } }).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))
    ).subscribe({
      next: result => {
        this.incidents.set(result.items);
        this.canPublish.set(result.canPublish);
      },
      error: () => this.error.set('Não foi possível carregar os avisos. Atualize o painel para tentar novamente.')
    });
  }

  showResolved(value: boolean): void {
    if (value === this.includeResolved) return;
    this.includeResolved = value;
    this.load();
  }

  edit(incident?: Contingency): void {
    this.formError.set('');
    this.saved.set('');
    const next = incident?.nextUpdateAt ? new Date(incident.nextUpdateAt) : new Date();
    const nextUpdate = next.valueOf() > Date.now() ? next : new Date(Date.now() + 60 * 60 * 1000);
    this.editor.set({
      id: incident?.id ?? null,
      input: {
        system: incident?.system ?? '', departments: [...incident?.departments ?? []], extension: incident?.extension ?? '',
        procedure: incident?.procedure ?? '', status: incident?.status ?? 'investigating', revision: incident?.revision ?? 0,
        message: '', nextUpdateAt: this.localInput(nextUpdate)
      }
    });
  }

  save(form: NgForm): void {
    const editor = this.editor();
    if (!editor || form.invalid || this.saving()) return;

    const next = editor.input.status === 'resolved' ? null : new Date(editor.input.nextUpdateAt);
    if (next && (!Number.isFinite(next.valueOf()) || next.valueOf() <= Date.now())) {
      this.formError.set('A próxima atualização precisa estar no futuro.');
      return;
    }

    this.formError.set('');
    this.saving.set(true);
    const { nextUpdateAt, ...input } = editor.input;
    const requestBody = { ...input, nextUpdateAt: next?.toISOString() ?? null };
    const request = editor.id == null ? this.http.post(this.url, requestBody)
      : this.http.patch(`${this.url}/${editor.id}`, requestBody);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.editor.set(null);
        if (input.status === 'resolved') this.includeResolved = true;
        this.saved.set(input.status === 'resolved' ? 'Ocorrência encerrada.' : 'Aviso publicado.');
        this.load();
      },
      error: (error: HttpErrorResponse) => this.formError.set(error.error?.message ?? 'Não foi possível publicar. Confira os campos do aviso.')
    });
  }

  download(incident: Contingency): void {
    const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const lines = [
      'Santa Casa de Lorena — Orientação de contingência',
      `Cópia de ${date.format(new Date())}. Consulte a TI para confirmar a situação atual.`,
      '', incident.system, this.statuses[incident.status], `Setores: ${incident.departments.join(', ')}`,
      `Ramal: ${incident.extension}`,
      ...(incident.nextUpdateAt ? [`Próxima atualização: ${date.format(new Date(incident.nextUpdateAt))}`] : []),
      '', 'Procedimento', incident.procedure, '', 'Última atualização', incident.updates.at(-1)?.message ?? ''
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `contingencia-${incident.id}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private localInput(date: Date): string {
    return new Date(date.valueOf() - date.getTimezoneOffset() * 60 * 1000).toISOString().slice(0, 16);
  }
}
