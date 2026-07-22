import { Component, OnInit } from '@angular/core';
import { PublicAccessLog, PaginatedPublicAccessLog } from '../../../models/public-access-log.model';
import { PublicAccessLogService } from '../../../core/services/public-access-log.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { map } from 'rxjs';
import { DEPARTMENTS } from '../../../shared/constants/departments.constants';

interface PageFilterOption {
  label: string;
  value: '' | 'noticias' | 'comunicados' | 'qualidade';
}

@Component({
  selector: 'app-public-access-log',
  standalone: false,
  templateUrl: './public-access-log.component.html',
  styleUrl: './public-access-log.component.css'
})
export class PublicAccessLogComponent implements OnInit {
  logs: PublicAccessLog[] = [];
  readonly sectors: string[] = DEPARTMENTS;
  pageFilter: PageFilterOption['value'] = '';
  sectorFilter = '';
  dateFrom = '';
  dateTo = '';
  currentPage = 1;
  perPage = 25;
  total = 0;
  totalPages = 0;
  isLoading = false;
  isExporting = false;
  errorMessage = '';
  private readonly exportPageSize = 100000;

  readonly pageOptions: PageFilterOption[] = [
    { label: 'Todos', value: '' },
    { label: 'Notícias', value: 'noticias' },
    { label: 'Comunicados', value: 'comunicados' },
    { label: 'Qualidade', value: 'qualidade' }
  ];

  constructor(private publicAccessLogService: PublicAccessLogService) { }

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(page: number = this.currentPage): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.currentPage = page;

    this.publicAccessLogService.getReport({
      pageType: this.pageFilter || undefined,
      startDate: this.getStartDateParam(),
      endDate: this.getEndDateParam(),
      sector: this.sectorFilter || undefined,
      page: this.currentPage,
      pageSize: this.perPage
    }).subscribe({
      next: (data: PaginatedPublicAccessLog) => {
        this.logs = data.logs;
        this.currentPage = data.currentPage;
        this.perPage = data.perPage;
        this.total = data.total;
        this.totalPages = data.pages;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.message || 'Erro ao carregar relatório de acessos.';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.loadLogs(1);
  }

  clearFilters(): void {
    this.pageFilter = '';
    this.sectorFilter = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.loadLogs(1);
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.loadLogs(page);
  }

  exportCsv(): void {
    this.loadFilteredLogsForExport().subscribe({
      next: (logs) => {
        const rows = [
          ['Data/Hora', 'Nome', 'RE', 'Setor', 'Página', 'Conteúdo'],
          ...logs.map(log => [
            this.formatDateTime(log.accessedAt),
            log.name,
            log.re,
            log.sector,
            this.getPageLabel(log.page),
            this.getContentLabel(log)
          ])
        ];
        const csv = rows
          .map(row => row.map(value => this.escapeCsvCell(String(value ?? ''))).join(';'))
          .join('\r\n');
        const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = 'relatorio-acessos-publicos.csv';
        anchor.hidden = true;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        this.isExporting = false;
      },
      error: (error) => this.handleExportError(error)
    });
  }

  exportPdf(): void {
    this.loadFilteredLogsForExport().subscribe({
      next: (logs) => {
        const doc = new jsPDF({ orientation: 'landscape' });
        const generatedAt = this.formatDateTime(new Date().toISOString());

        doc.setFontSize(16);
        doc.text('Relatório de Acessos Públicos', 14, 16);
        doc.setFontSize(10);
        doc.text(`Data de geração: ${generatedAt}`, 14, 24);
        doc.text(`Filtros: ${this.getAppliedFiltersLabel()}`, 14, 31);

        autoTable(doc, {
          startY: 38,
          head: [['Data/Hora', 'Nome', 'RE', 'Setor', 'Página', 'Conteúdo']],
          body: logs.map(log => [
            this.formatDateTime(log.accessedAt),
            log.name,
            log.re,
            log.sector,
            this.getPageLabel(log.page),
            this.getContentLabel(log)
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [34, 188, 238] }
        });

        doc.save('relatorio-acessos-publicos.pdf');
        this.isExporting = false;
      },
      error: (error) => this.handleExportError(error)
    });
  }

  getPageLabel(page: string): string {
    const normalizedPage = page?.toLowerCase();

    switch (normalizedPage) {
      case 'noticias':
      case 'notícias':
        return 'Notícias';
      case 'comunicados':
        return 'Comunicados';
      case 'qualidade':
      case 'minuto de qualidade':
        return 'Qualidade';
      default:
        return page || '-';
    }
  }

  private loadFilteredLogsForExport() {
    this.isExporting = true;
    this.errorMessage = '';

    return this.publicAccessLogService.getReport({
      pageType: this.pageFilter || undefined,
      startDate: this.getStartDateParam(),
      endDate: this.getEndDateParam(),
      sector: this.sectorFilter || undefined,
      page: 1,
      pageSize: this.exportPageSize
    }).pipe(
      map(data => data.logs)
    );
  }

  private getStartDateParam(): string | undefined {
    return this.dateFrom ? `${this.dateFrom}T00:00:00` : undefined;
  }

  private getEndDateParam(): string | undefined {
    return this.dateTo ? `${this.dateTo}T23:59:59` : undefined;
  }

  private getAppliedFiltersLabel(): string {
    const pageLabel = this.pageOptions.find(option => option.value === this.pageFilter)?.label || 'Todos';
    const sectorLabel = this.sectorFilter || 'Todos';
    const startDate = this.dateFrom ? this.formatDateOnly(this.dateFrom) : 'sem data inicial';
    const endDate = this.dateTo ? this.formatDateOnly(this.dateTo) : 'sem data final';

    return `Página: ${pageLabel}; Setor: ${sectorLabel}; Período: ${startDate} até ${endDate}`;
  }

  private formatDateOnly(date: string): string {
    const [year, month, day] = date.split('-');

    return `${day}/${month}/${year}`;
  }

  private formatDateTime(value: string): string {
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getContentLabel(log: PublicAccessLog): string {
    if (!log.contentTitle?.trim()) {
      return '-';
    }

    return log.contentId
      ? `#${log.contentId} - ${log.contentTitle}`
      : log.contentTitle;
  }

  private escapeCsvCell(value: string): string {
    const formulaSafeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${formulaSafeValue.replace(/"/g, '""')}"`;
  }

  private handleExportError(error: any): void {
    this.isExporting = false;
    this.errorMessage = error.message || 'Erro ao exportar relatório.';
  }
}
