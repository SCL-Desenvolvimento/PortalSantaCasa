import { Component } from '@angular/core';
import { DocumentService } from '../../services/document.service';
import { Document } from '../../models/document.model';
import { environment } from '../../../environments/environment';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-documents-view',
  standalone: false,
  templateUrl: './documents-view.component.html',
  styleUrl: './documents-view.component.css'
})
export class DocumentsViewComponent {
  documents: Document[] = [];
  filteredDocuments: Document[] = [];
  currentDocument: Document | null = null;
  fullscreenDocument: Document | null = null;
  searchQuery: string = '';
  safeCurrentDocumentUrl: SafeResourceUrl | null = null;

  constructor(
    private documentService: DocumentService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.documentService.getDocuments().subscribe({
      next: (data) => {
        this.documents = data.map(document => ({
          ...document,
          fileUrl: document.fileName ? `${environment.imageServerUrl}${document.fileUrl}` : null
        }));

        this.buildTree();
      },
      error: (error) => {
        console.error('Erro ao carregar documentos:', error);
      }
    });
  }

  buildTree(): void {
    const map = new Map<number, Document>();
    this.documents.forEach(doc => {
      doc.children = [];
      if (doc.id !== undefined)
        map.set(doc.id, doc);
    });

    const tree: Document[] = [];

    this.documents.forEach(doc => {
      if (doc.parentId) {
        const parent = map.get(doc.parentId);
        if (parent) {
          parent.children!.push(doc);
        }
      } else {
        tree.push(doc);
      }
    });

    this.filteredDocuments = tree;
  }

  filterDocuments(): void {
    if (!this.searchQuery) {
      this.buildTree();
      return;
    }

    const query = this.searchQuery.toLowerCase();
    const results: Document[] = [];

    const map = new Map<number, Document>();
    this.documents.forEach(doc => {
      if (doc.id !== undefined)
        map.set(doc.id, { ...doc, children: [], expanded: false });
    });

    this.documents.forEach(doc => {
      if (doc.name.toLowerCase().includes(query)) {
        this.markParentsExpanded(doc, map);
      }
    });

    // montar árvore com os documentos expandidos
    const tree: Document[] = [];
    map.forEach(doc => {
      if (doc.parentId) {
        const parent = map.get(doc.parentId);
        if (parent) {
          parent.children!.push(doc);
        }
      } else {
        tree.push(doc);
      }
    });

    this.filteredDocuments = tree;
  }

  private markParentsExpanded(doc: Document, map: Map<number, Document>) {
    let current = doc;
    while (current.parentId) {
      const parent = map.get(current.parentId);
      if (!parent) break;
      parent.expanded = true;
      current = parent;
    }
  }

  selectDocument(doc: Document): void {
    if (doc.fileUrl && (!this.currentDocument || this.currentDocument.id !== doc.id)) {
      this.currentDocument = doc;
      this.safeCurrentDocumentUrl = this.getSafeUrl(doc.fileUrl);
    }
  }


  clearViewer(): void {
    this.currentDocument = null;
  }

  openFullscreen(doc: Document): void {
    this.fullscreenDocument = doc;
  }

  closeFullscreen(): void {
    this.fullscreenDocument = null;
  }

  getSafeUrl(url: string | null | undefined): SafeResourceUrl | null {
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }
}
