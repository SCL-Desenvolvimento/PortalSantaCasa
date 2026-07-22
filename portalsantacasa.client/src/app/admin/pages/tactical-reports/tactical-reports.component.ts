import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TacticalReportsService } from '../../../core/services/tactical-reports.service';
import { TacticalReportDefinition, TacticalReportResult } from '../../../models/tactical-report.model';

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

  constructor(
    private readonly service: TacticalReportsService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.slug = params.get('slug') ?? '';
      this.report = undefined;
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

  get columns(): string[] {
    const keys = new Set<string>();
    (this.report?.rows ?? []).slice(0, 100).forEach(row => Object.keys(row).forEach(key => keys.add(key)));
    return Array.from(keys).slice(0, 14);
  }

  get visibleRows(): Record<string, unknown>[] {
    const start = (this.page - 1) * this.pageSize;
    return (this.report?.rows ?? []).slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil((this.report?.rows.length ?? 0) / this.pageSize));
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

  display(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    return String(value);
  }

  exportCsv(): void {
    if (!this.report?.rows.length) return;
    const columns = this.columns;
    const quote = (value: unknown) => `"${this.display(value).replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [columns.map(quote).join(';'), ...this.report.rows.map(row => columns.map(c => quote(row[c])).join(';'))].join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `${this.report.report.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
