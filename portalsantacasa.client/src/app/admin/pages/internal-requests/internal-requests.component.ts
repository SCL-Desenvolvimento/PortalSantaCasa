import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { afterNextRender, Component, DestroyRef, ElementRef, inject, Injector, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

type RequestStatus = 'recebida' | 'em-andamento' | 'concluida';
type RequestView = 'mine' | 'queue';

interface RequestService {
  code: string;
  name: string;
  department: string;
}

interface RequestSummary {
  id: number;
  protocol: string;
  serviceName: string;
  department: string;
  requesterName: string;
  status: RequestStatus;
  dueDate: string | null;
  createdAt: string;
  version: number;
}

interface RequestEvent {
  version: number;
  actorName: string;
  status: RequestStatus;
  dueDate: string | null;
  reply: string | null;
  createdAt: string;
}

interface RequestDetail {
  request: RequestSummary;
  history: RequestEvent[];
}

interface RequestPage {
  items: RequestSummary[];
  hasMore: boolean;
}

@Component({
  selector: 'app-internal-requests',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './internal-requests.component.html',
  styleUrl: './internal-requests.component.css'
})
export class InternalRequestsComponent implements OnInit {
  readonly statusLabels: Record<RequestStatus, string> = {
    'recebida': 'Recebida',
    'em-andamento': 'Em andamento',
    'concluida': 'Concluída'
  };

  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly api = `${environment.apiUrl}/internalrequests`;
  private pendingCreate?: string;
  private pendingUpdate?: { payload: string; operationId: string };

  services: RequestService[] = [];
  canManage = false;
  catalogLoading = false;
  catalogError = false;
  creating = false;
  createError = '';
  notice = '';

  view: RequestView = 'mine';
  items: RequestSummary[] = [];
  page = 1;
  hasMore = false;
  listLoading = false;
  listError = false;

  selectedId: number | null = null;
  selected: RequestDetail | null = null;
  detailLoading = false;
  detailError = false;
  saving = false;
  saveError = '';
  needsReload = false;
  nextStatus: RequestStatus = 'recebida';
  nextDueDate = '';
  reply = '';

  @ViewChild('listHeading') private listHeading?: ElementRef<HTMLElement>;

  @ViewChild('detailHeading') set detailHeading(heading: ElementRef<HTMLElement> | undefined) {
    heading?.nativeElement.focus();
  }

  ngOnInit(): void {
    this.loadCatalog();
    this.loadList();
  }

  loadCatalog(): void {
    this.catalogLoading = true;
    this.catalogError = false;
    this.http.get<{ services: RequestService[]; canManage: boolean }>(`${this.api}/catalog`)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.catalogLoading = false))
      .subscribe({
        next: catalog => {
          this.services = catalog.services;
          this.canManage = catalog.canManage;
        },
        error: () => this.catalogError = true
      });
  }

  changeView(view: RequestView): void {
    if (view === this.view || this.listLoading || this.detailLoading || this.creating || this.saving) return;
    this.view = view;
    this.items = [];
    this.page = 1;
    this.hasMore = false;
    this.selectedId = null;
    this.selected = null;
    this.notice = '';
    this.loadList();
  }

  loadList(page = this.page): void {
    this.listLoading = true;
    this.listError = false;
    this.http.get<RequestPage>(`${this.api}/${this.view}`, { params: { page } })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.listLoading = false))
      .subscribe({
        next: result => {
          this.items = result.items;
          this.hasMore = result.hasMore;
          this.page = page;
        },
        error: () => this.listError = true
      });
  }

  create(service: RequestService): void {
    if (this.creating || this.detailLoading || this.listLoading || this.saving) return;
    const userId = this.auth.getUserInfo('id');
    const storageKey = userId ? `internal-request:${userId}:${service.code}` : null;
    const saved = storageKey ? sessionStorage.getItem(storageKey) : null;
    const operationId = this.pendingCreate ?? saved ?? this.newOperationId();
    this.pendingCreate = operationId;
    if (storageKey) sessionStorage.setItem(storageKey, operationId);
    this.createError = '';
    this.notice = '';
    this.creating = true;
    this.http.post<RequestDetail>(this.api, { serviceCode: service.code, operationId })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.creating = false))
      .subscribe({
        next: detail => {
          this.pendingCreate = undefined;
          if (storageKey) sessionStorage.removeItem(storageKey);
          this.notice = `Solicitação registrada. Protocolo ${detail.request.protocol}.`;
          this.setDetail(detail);
          this.loadList(1);
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 409) {
            this.pendingCreate = undefined;
            if (storageKey) sessionStorage.removeItem(storageKey);
          }
          this.createError = this.errorDetail(error, 'Não foi possível confirmar o envio. Tente novamente.');
        }
      });
  }

  openDetail(id: number): void {
    if (this.detailLoading || this.creating || this.saving) return;
    this.selectedId = id;
    this.selected = null;
    this.detailLoading = true;
    this.detailError = false;
    this.saveError = '';
    this.notice = '';
    this.http.get<RequestDetail>(`${this.api}/${id}`)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.detailLoading = false))
      .subscribe({
        next: detail => this.setDetail(detail),
        error: () => this.detailError = true
      });
  }

  closeDetail(): void {
    if (this.detailLoading || this.saving) return;
    this.selectedId = null;
    this.selected = null;
    this.detailError = false;
    this.saveError = '';
    afterNextRender(() => this.listHeading?.nativeElement.focus(), { injector: this.injector });
  }

  get canSave(): boolean {
    if (!this.canManage || this.view !== 'queue' || !this.selected || this.needsReload) return false;
    const request = this.selected.request;
    const reply = this.reply.trim();
    if (request.status === 'concluida' || (this.nextStatus === 'concluida' && !reply)) return false;
    return this.nextStatus !== request.status || (this.nextDueDate || null) !== request.dueDate || !!reply;
  }

  save(): void {
    if (!this.canSave || this.saving || !this.selected) return;
    const { id, version } = this.selected.request;
    const update = { version, status: this.nextStatus, dueDate: this.nextDueDate || null, reply: this.reply.trim() || null };
    const payload = JSON.stringify({ id, ...update });
    const operationId = this.pendingUpdate?.payload === payload ? this.pendingUpdate.operationId : this.newOperationId();
    this.pendingUpdate = { payload, operationId };
    this.saving = true;
    this.saveError = '';
    this.notice = '';

    this.http.put<RequestDetail>(`${this.api}/${id}`, { ...update, operationId })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving = false))
      .subscribe({
        next: detail => {
          this.notice = `Andamento do protocolo ${detail.request.protocol} atualizado.`;
          this.setDetail(detail);
          this.loadList();
        },
        error: (error: HttpErrorResponse) => {
          this.needsReload = error.status === 409;
          this.saveError = this.errorDetail(error, 'Não foi possível confirmar a atualização. Tente novamente.');
        }
      });
  }

  private setDetail(detail: RequestDetail): void {
    this.selectedId = detail.request.id;
    this.selected = detail;
    this.detailError = false;
    this.nextStatus = detail.request.status;
    this.nextDueDate = detail.request.dueDate ?? '';
    this.reply = '';
    this.needsReload = false;
    this.pendingUpdate = undefined;
  }

  private errorDetail(error: HttpErrorResponse, fallback: string): string {
    return typeof error.error?.detail === 'string' ? error.error.detail : fallback;
  }

  private newOperationId(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
  }
}
