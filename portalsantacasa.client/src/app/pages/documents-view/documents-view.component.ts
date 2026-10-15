import { Component, DestroyRef, inject, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from, map, of, Subscription, switchMap } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentService } from '../../core/services/document.service';
import { Document } from '../../models/document.model';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute } from '@angular/router';

@Component({ selector: 'app-documents-view', standalone: false, templateUrl: './documents-view.component.html', styleUrl: './documents-view.component.css' })
export class DocumentsViewComponent implements OnInit, OnDestroy {
  documents: Document[] = [];
  filteredDocuments: Document[] = [];
  currentDocument: Document | null = null;
  searchQuery = '';
  safeCurrentDocumentUrl: SafeResourceUrl | null = null;
  textContent = '';
  isLoadingDocument = false;
  isLoadingDocuments = true;
  hasDocumentsError = false;
  hasDocumentError = false;
  private blobUrl: string | null = null;
  private previewSubscription?: Subscription;
  private readonly destroyRef = inject(DestroyRef);

  constructor(private documentService: DocumentService, private sanitizer: DomSanitizer, private toastr: ToastrService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoadingDocuments = true;
    this.hasDocumentsError = false;
    this.documentService.getPublicDocuments().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: documents => {
        this.documents = documents.map(document => ({
          ...document,
          allowedRoles: document.allowedRoles || []
        }));
        this.filterDocuments();
        this.isLoadingDocuments = false;
        const requestedId = Number(this.route.snapshot.queryParamMap.get('documentId'));
        const requestedDocument = Number.isInteger(requestedId)
          ? this.documents.find(document => document.id === requestedId)
          : undefined;
        if (requestedDocument) this.selectDocument(requestedDocument);
      },
      error: () => {
        this.isLoadingDocuments = false;
        this.hasDocumentsError = true;
      }
    });
  }

  ngOnDestroy(): void { this.clearViewer(); }

  get isTextDocument(): boolean { return !!this.currentDocument && this.extension(this.currentDocument) === 'txt'; }
  get isPdf(): boolean { return !!this.currentDocument && this.extension(this.currentDocument) === 'pdf'; }
  get documentTypeLabel(): string {
    const extension = this.currentDocument ? this.extension(this.currentDocument).toUpperCase() : '';
    return extension || 'Arquivo';
  }

  buildTree(): void {
    const map = new Map<number, Document>();
    this.documents.forEach(document => { document.children = []; if (document.id != null) map.set(document.id, document); });
    this.filteredDocuments = this.documents.filter(document => {
      if (document.parentId) { const parent = map.get(document.parentId); if (parent) { parent.children!.push(document); return false; } }
      return true;
    });
  }

  filterDocuments(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) { this.buildTree(); return; }
    const ids = new Set<number>();
    const byId = new Map(this.documents.filter(document => document.id != null).map(document => [document.id!, document]));
    this.documents.filter(document => document.name.toLowerCase().includes(query) || (document.fileName || '').toLowerCase().includes(query)).forEach(document => {
      let current: Document | undefined = document;
      while (current?.id != null) { ids.add(current.id); current = current.parentId ? byId.get(current.parentId) : undefined; }
    });
    const original = this.documents;
    this.documents = original.filter(document => document.id != null && ids.has(document.id)).map(document => ({ ...document, children: [] }));
    this.buildTree();
    this.documents = original;
  }

  selectDocument(document: Document): void {
    if (!document.id || !document.fileName) return;
    this.clearViewer();
    this.currentDocument = document;
    this.isLoadingDocument = true;

    if (!this.isPdf && !this.isTextDocument) {
      this.isLoadingDocument = false;
      return;
    }

    const isText = this.isTextDocument;
    this.previewSubscription = this.documentService.getPublicDocumentContent(document.id).pipe(
      switchMap(blob => isText
        ? from(blob.text()).pipe(map(text => ({ text, blob: null })))
        : of({ text: '', blob })),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: preview => {
        if (preview.blob) {
          this.blobUrl = URL.createObjectURL(preview.blob);
          this.safeCurrentDocumentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl);
        } else {
          this.textContent = preview.text;
        }
        this.isLoadingDocument = false;
      },
      error: () => { this.isLoadingDocument = false; this.hasDocumentError = true; }
    });
  }

  downloadCurrent(): void {
    const selectedDocument = this.currentDocument;
    if (!selectedDocument?.id) return;
    this.documentService.getPublicDocumentContent(selectedDocument.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = selectedDocument.fileName || selectedDocument.name || 'documento'; link.click(); URL.revokeObjectURL(url);
      },
      error: () => this.toastr.error('Não foi possível baixar este documento.')
    });
  }

  clearViewer(): void {
    this.previewSubscription?.unsubscribe();
    this.currentDocument = null;
    this.safeCurrentDocumentUrl = null;
    this.textContent = '';
    this.isLoadingDocument = false;
    this.hasDocumentError = false;
    this.revokeBlobUrl();
  }
  private extension(document: Document): string { return (document.fileName || '').split('.').pop()?.toLowerCase() || ''; }
  private revokeBlobUrl(): void { if (this.blobUrl) URL.revokeObjectURL(this.blobUrl); this.blobUrl = null; }
}
