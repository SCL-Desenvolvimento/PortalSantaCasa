import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentService } from '../../core/services/document.service';
import { Document } from '../../models/document.model';
import { ToastrService } from 'ngx-toastr';

@Component({ selector: 'app-documents-view', standalone: false, templateUrl: './documents-view.component.html', styleUrl: './documents-view.component.css' })
export class DocumentsViewComponent implements OnInit, OnDestroy {
  documents: Document[] = [];
  filteredDocuments: Document[] = [];
  currentDocument: Document | null = null;
  searchQuery = '';
  safeCurrentDocumentUrl: SafeResourceUrl | null = null;
  textContent = '';
  isLoadingDocument = false;
  private blobUrl: string | null = null;

  constructor(private documentService: DocumentService, private sanitizer: DomSanitizer, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.documentService.getDocuments().subscribe({
      next: documents => {
        this.documents = documents.map(document => ({
          ...document,
          allowedRoles: document.allowedRoles || []
        }));
        this.buildTree();
      },
      error: () => this.toastr.error('Entre com seu usuário para acessar os documentos.')
    });
  }

  ngOnDestroy(): void { this.revokeBlobUrl(); }

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
    this.currentDocument = document;
    this.isLoadingDocument = true;
    this.revokeBlobUrl();
    this.safeCurrentDocumentUrl = null;
    this.textContent = '';

    if (!this.isPdf && !this.isTextDocument) {
      this.isLoadingDocument = false;
      return;
    }

    this.documentService.getDocumentContent(document.id).subscribe({
      next: blob => {
        this.blobUrl = URL.createObjectURL(blob);
        if (this.isTextDocument) blob.text().then(content => this.textContent = content);
        else this.safeCurrentDocumentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl!);
        this.isLoadingDocument = false;
      },
      error: () => { this.isLoadingDocument = false; this.toastr.error('Não foi possível abrir este documento.'); }
    });
  }

  downloadCurrent(): void {
    if (!this.currentDocument?.id) return;
    this.documentService.getDocumentContent(this.currentDocument.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = this.currentDocument?.fileName || this.currentDocument?.name || 'documento'; link.click(); URL.revokeObjectURL(url);
      },
      error: () => this.toastr.error('Não foi possível baixar este documento.')
    });
  }

  clearViewer(): void { this.currentDocument = null; this.safeCurrentDocumentUrl = null; this.revokeBlobUrl(); }
  private extension(document: Document): string { return (document.fileName || '').split('.').pop()?.toLowerCase() || ''; }
  private revokeBlobUrl(): void { if (this.blobUrl) URL.revokeObjectURL(this.blobUrl); this.blobUrl = null; }
}
