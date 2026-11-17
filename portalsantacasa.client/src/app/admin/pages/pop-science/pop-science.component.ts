import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, Injector, OnInit, afterNextRender, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

interface PopVersion {
  number: number;
  owner: string;
  releaseNote: string;
  reviewDate: string;
  acknowledgementDeadline: string | null;
  publishedAt: string;
  publishedByName: string;
  fileName: string | null;
  body: string | null;
  assigned: boolean;
  confirmedAt: string | null;
}

interface PopItem {
  id: number;
  title: string;
  kind: 'pop' | 'comunicado';
  department: string;
  canManage: boolean;
  canTrack: boolean;
  versions: PopVersion[];
}

interface PopModule {
  publisherDepartments: string[];
  items: PopItem[];
}

interface PopReceipt {
  userId: number;
  username: string;
  confirmedAt: string | null;
}

@Component({
  selector: 'app-pop-science',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './pop-science.component.html',
  styleUrl: './pop-science.component.css'
})
export class PopScienceComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly documentsHeading = viewChild<ElementRef<HTMLElement>>('documentsHeading');
  private readonly detailsHeading = viewChild<ElementRef<HTMLElement>>('detailsHeading');
  private readonly publicationHeading = viewChild<ElementRef<HTMLElement>>('publicationHeading');
  private readonly api = `${environment.apiUrl}/pop-science`;

  data: PopModule = { publisherDepartments: [], items: [] };
  selectedId = 0;
  selectedNumber = 0;
  loading = true;
  saving = false;
  downloading = false;
  error = '';
  notice = '';
  readerError = '';
  linkMessage = '';
  onlyPending = false;
  readVersion = false;
  receipts: PopReceipt[] | null = null;
  trackingLoading = false;
  trackingKey = '';
  publicationMode: 'new' | 'version' | null = null;
  editItemId = 0;
  file: File | null = null;
  form = this.initialForm();

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = Number(params.get('documento')) || 0;
      if (id === this.selectedId) return;
      this.selectedId = id;
      this.publicationMode = null;
      this.linkMessage = '';
      this.selectVersion(0);
      if (!this.loading) this.focusAfterRender(id ? this.detailsHeading : this.documentsHeading);
    });
    this.load();
  }

  get selectedItem(): PopItem | undefined {
    return this.data.items.find(item => item.id === this.selectedId);
  }

  get selectedVersion(): PopVersion | undefined {
    const versions = this.selectedItem?.versions;
    return versions?.find(version => version.number === this.selectedNumber) ?? versions?.[0];
  }

  get editItem(): PopItem | undefined {
    return this.data.items.find(item => item.id === this.editItemId);
  }

  get publicationUsesPdf(): boolean {
    return (this.publicationMode === 'version' ? this.editItem?.kind : this.form.kind) === 'pop';
  }

  get visibleItems(): PopItem[] {
    return this.onlyPending ? this.data.items.filter(item => this.pendingCount(item) > 0) : this.data.items;
  }

  get totalPending(): number {
    return this.data.items.reduce((count, item) => count + this.pendingCount(item), 0);
  }

  get trackingPending(): number {
    return this.receipts?.filter(receipt => !receipt.confirmedAt).length ?? 0;
  }

  pendingCount(item: PopItem): number {
    return item.versions.filter(version => version.assigned && !version.confirmedAt).length;
  }

  selectVersion(number: number): void {
    this.selectedNumber = number;
    this.readVersion = false;
    this.receipts = null;
    this.trackingLoading = false;
    this.trackingKey = '';
    this.readerError = '';
  }

  openPublication(item?: PopItem): void {
    this.notice = this.error = '';
    this.publicationMode = item ? 'version' : 'new';
    this.editItemId = item?.id ?? 0;
    this.file = null;
    this.form = this.initialForm();
    this.form.department = this.data.publisherDepartments.length === 1 ? this.data.publisherDepartments[0] : '';
    this.form.owner = item?.versions[0].owner ?? '';
    this.form.reviewDate = item?.versions[0].reviewDate ?? '';
    this.focusAfterRender(this.publicationHeading);
  }

  cancelPublication(): void {
    this.publicationMode = null;
    this.error = '';
    this.focusAfterRender(this.selectedId ? this.detailsHeading : this.documentsHeading);
  }

  setFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.item(0) ?? null;
  }

  publish(): void {
    if (!this.publicationMode || this.saving) return;
    const file = this.file;
    if (this.publicationUsesPdf && (!file || file.size > 20 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.pdf'))) {
      this.error = 'Escolha um arquivo PDF de até 20 MB.';
      return;
    }
    this.saving = true;
    this.notice = this.error = '';
    const publishingVersion = this.publicationMode === 'version';
    const body = new FormData();
    if (this.publicationUsesPdf && file) body.set('file', file);
    else body.set('body', this.form.body.trim());
    body.set('owner', this.form.owner.trim());
    body.set('releaseNote', this.form.releaseNote.trim());
    body.set('reviewDate', this.form.reviewDate);
    if (this.form.requestScience) body.set('acknowledgementDeadline', this.form.deadline);
    if (!publishingVersion) {
      body.set('title', this.form.title.trim());
      body.set('kind', this.form.kind);
      body.set('department', this.form.department);
    }

    this.http.post<{ itemId: number; number: number }>(publishingVersion ? `${this.api}/${this.editItemId}/versions` : this.api, body)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: publication => {
          this.saving = false;
          this.publicationMode = null;
          this.onlyPending = false;
          this.notice = `Versão ${publication.number} publicada.`;
          this.selectVersion(0);
          this.load();
          void this.router.navigate([], { relativeTo: this.route, queryParams: { documento: publication.itemId } });
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.error = err.error?.message || 'Não foi possível publicar o documento. Confira os campos e tente novamente.';
        }
      });
  }

  confirm(item: PopItem, version: PopVersion): void {
    if (!this.readVersion || this.saving || !version.assigned || version.confirmedAt) return;
    this.saving = true;
    this.readerError = '';
    this.http.post<{ confirmedAt: string }>(`${this.versionUrl(item, version)}/confirm`, null)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: result => {
          this.saving = false;
          version.confirmedAt = result.confirmedAt;
          if (this.trackingKey === this.versionUrl(item, version)) this.loadTracking(item, version);
        },
        error: () => {
          this.saving = false;
          if (this.selectedItem === item && this.selectedVersion === version) {
            this.readerError = 'Não foi possível registrar sua ciência. Tente novamente.';
          }
        }
      });
  }

  download(item: PopItem, version: PopVersion): void {
    const fileName = version.fileName;
    if (!fileName || this.downloading) return;
    this.downloading = true;
    this.readerError = '';
    this.http.get(`${this.versionUrl(item, version)}/content`, { responseType: 'blob' })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: blob => {
          this.downloading = false;
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        error: () => {
          this.downloading = false;
          if (this.selectedItem === item && this.selectedVersion === version) {
            this.readerError = 'Não foi possível baixar o PDF desta versão.';
          }
        }
      });
  }

  loadTracking(item: PopItem, version: PopVersion): void {
    const key = this.versionUrl(item, version);
    this.trackingKey = key;
    this.trackingLoading = true;
    this.readerError = '';
    this.http.get<PopReceipt[]>(`${key}/tracking`).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: receipts => {
        if (this.trackingKey !== key) return;
        this.trackingLoading = false;
        this.receipts = receipts;
      },
      error: () => {
        if (this.trackingKey !== key) return;
        this.trackingLoading = false;
        this.readerError = 'Não foi possível carregar o acompanhamento desta versão.';
      }
    });
  }

  kindLabel(item: PopItem): string { return item.kind === 'pop' ? 'POP' : 'Comunicado'; }

  dateOnly(value: string): string { return value.split('-').reverse().join('/'); }

  isLate(dueDate: string): boolean {
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(new Date());
    const today = ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
    return today > dueDate;
  }

  async copyLink(item: PopItem): Promise<void> {
    const tree = this.router.createUrlTree([], { relativeTo: this.route, queryParams: { documento: item.id } });
    try {
      await navigator.clipboard.writeText(new URL(this.router.serializeUrl(tree), location.origin).href);
      if (this.selectedItem === item) this.linkMessage = 'Link permanente copiado.';
    } catch {
      if (this.selectedItem === item) this.linkMessage = 'Copie o endereço desta página para compartilhar o link permanente.';
    }
  }

  load(): void {
    this.loading = true;
    this.http.get<PopModule>(this.api).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => { this.data = data; this.loading = false; },
      error: () => { this.loading = false; this.error = 'Não foi possível carregar os POPs e comunicados.'; }
    });
  }

  private versionUrl(item: PopItem, version: PopVersion): string { return `${this.api}/${item.id}/versions/${version.number}`; }

  private focusAfterRender(heading: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(() => heading()?.nativeElement.focus(), { injector: this.injector });
  }

  private initialForm() {
    return { title: '', kind: 'pop', department: '', owner: '', releaseNote: '', reviewDate: '', requestScience: false, deadline: '', body: '' };
  }
}
