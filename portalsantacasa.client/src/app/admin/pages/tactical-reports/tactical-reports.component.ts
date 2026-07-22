import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TacticalReportsService } from '../../../core/services/tactical-reports.service';
import { TacticalColumn, TacticalReportDefinition, TacticalReportResult } from '../../../models/tactical-report.model';

@Component({
  selector: 'app-tactical-reports',
  standalone: false,
  templateUrl: './tactical-reports.component.html',
  styleUrl: './tactical-reports.component.css'
})
export class TacticalReportsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  catalog: TacticalReportDefinition[] = [];
  report?: TacticalReportResult;
  slug = '';
  search = '';
  category = 'Todos';
  agentId = '';
  loading = true;
  error = '';
  page = 1;
  readonly pageSize = 50;
  activeFilters: Record<string, string> = {};

  constructor(
    private readonly service: TacticalReportsService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.slug = params.get('slug') ?? '';
      this.report = undefined;
      this.activeFilters = {};
      this.page = 1;
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get categories(): string[] {
    return ['Todos', ...Array.from(new Set(this.catalog.map(x => x.category))).sort()];
  }

  get filteredCatalog(): TacticalReportDefinition[] {
    const term = this.search.trim().toLocaleLowerCase('pt-BR');
    return this.catalog.filter(item =>
      (this.category === 'Todos' || item.category === this.category) &&
      (!term || `${item.title} ${item.description} ${item.category}`.toLocaleLowerCase('pt-BR').includes(term))
    );
  }

  get columns(): TacticalColumn[] {
    return this.report?.presentation.columns ?? [];
  }

  get visibleRows(): Record<string, unknown>[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredRows.slice(start, start + this.pageSize);
  }

  get filteredRows(): Record<string, unknown>[] {
    const rows = this.report?.presentation.rows ?? [];
    const search = (this.activeFilters['_search'] ?? '').trim().toLocaleLowerCase('pt-BR');
    return rows.filter(row => {
      if (search && !Object.values(row).some(value => this.display(value).toLocaleLowerCase('pt-BR').includes(search))) return false;
      return Object.entries(this.activeFilters).every(([key, selected]) => {
        if (key === '_search' || !selected) return true;
        return String(row[key] ?? '').toLocaleLowerCase('pt-BR') === selected.toLocaleLowerCase('pt-BR');
      });
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));
  }

  load(): void {
    this.loading = true;
    this.error = '';
    if (!this.slug) {
      this.service.getCatalog().pipe(takeUntil(this.destroy$)).subscribe({
        next: catalog => { this.catalog = catalog; this.loading = false; },
        error: () => { this.error = 'Não foi possível carregar o catálogo de relatórios.'; this.loading = false; }
      });
      return;
    }

    this.service.getReport(this.slug, this.agentId).pipe(takeUntil(this.destroy$)).subscribe({
      next: report => { this.report = report; this.loading = false; },
      error: error => { this.error = error?.error?.error ?? 'Não foi possível gerar o relatório.'; this.loading = false; }
    });
  }

  open(item: TacticalReportDefinition): void {
    this.router.navigate(['/admin/ti/relatorios', item.slug]);
  }

  back(): void {
    this.router.navigate(['/admin/ti/relatorios']);
  }

  display(value: unknown, format = 'text'): string {
    if (value === null || value === undefined || value === '') return '—';
    if (format === 'boolean') return value ? 'Sim' : 'Não';
    if (format === 'percent') return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
    if (format === 'megabytes') return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
    if (format === 'gigabytes') return `${Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`;
    if (format === 'score') return `${value}/100`;
    if (format === 'date') {
      const date = new Date(String(value));
      if (!Number.isNaN(date.getTime())) return date.toLocaleString('pt-BR');
    }
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'number') return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    const text = String(value);
    const translated: Record<string, string> = {
      running: 'Em execução', stopped: 'Parado', automatic: 'Automático', auto: 'Automático',
      manual: 'Manual', disabled: 'Desabilitado', critical: 'Crítica', important: 'Importante',
      moderate: 'Moderada', low: 'Baixa', warning: 'Aviso', error: 'Erro', success: 'Sucesso',
      workstation: 'Estação de trabalho', server: 'Servidor', online: 'Online', offline: 'Offline', overdue: 'Comunicação atrasada'
    };
    return translated[text.toLowerCase()] ?? text;
  }

  barWidth(value: number, data: { value: number }[]): number {
    const max = Math.max(...data.map(item => item.value), 1);
    return Math.max(3, value * 100 / max);
  }

  donutStyle(data: { value: number; color: string }[]): string {
    const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
    let start = 0;
    const stops = data.map(item => {
      const end = start + item.value * 100 / total;
      const segment = `${item.color} ${start}% ${end}%`;
      start = end;
      return segment;
    });
    return `conic-gradient(${stops.join(',')})`;
  }

  totalChart(data: { value: number }[]): number {
    return data.reduce((sum, item) => sum + item.value, 0);
  }

  filterChanged(): void {
    this.page = 1;
  }

  clearReportFilters(): void {
    this.activeFilters = {};
    this.page = 1;
  }

  get hasReportFilters(): boolean {
    return Object.values(this.activeFilters).some(value => !!value);
  }

  exportCsv(): void {
    const report = this.report;
    if (!report || !this.filteredRows.length) return;
    const columns = this.columns;
    const quote = (value: unknown) => `"${this.display(value).replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [columns.map(c => quote(c.label)).join(';'), ...this.filteredRows.map(row => columns.map(c => quote(this.display(row[c.key], c.format))).join(';'))].join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `${report.report.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
