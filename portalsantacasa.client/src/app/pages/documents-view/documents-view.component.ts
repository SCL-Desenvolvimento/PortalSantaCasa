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
  safeFullscreenUrl: SafeResourceUrl | null = null;

  constructor(
    private documentService: DocumentService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.documentService.getDocuments().subscribe({
      next: (data) => {
        this.documents = data.map(document => ({
          ...document,
          fileUrl: document.fileName ? `${environment.serverUrl}${document.fileUrl}` : null
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

    // Mapa original (para lookup rápido)
    const originalMap = new Map<number, Document>();
    this.documents.forEach(doc => {
      if (doc.id !== undefined) {
        originalMap.set(doc.id, doc);
      }
    });

    // Conjunto com IDs que devem aparecer (resultados + pais)
    const includedIds = new Set<number>();

    // 1. Adiciona documentos que batem com a busca
    this.documents.forEach(doc => {
      if (doc.name.toLowerCase().includes(query)) {
        includedIds.add(doc.id!);
        this.addParentIds(doc, originalMap, includedIds);
      }
    });

    // 2. Cria cópias filtradas apenas dos documentos incluídos
    const filteredDocsMap = new Map<number, Document>();
    includedIds.forEach(id => {
      const doc = originalMap.get(id);
      if (doc) {
        filteredDocsMap.set(id, { ...doc, children: [], expanded: true });
      }
    });

    // 3. Monta a árvore só com os incluídos
    const tree: Document[] = [];
    filteredDocsMap.forEach(doc => {
      if (doc.parentId && filteredDocsMap.has(doc.parentId)) {
        filteredDocsMap.get(doc.parentId)!.children!.push(doc);
      } else {
        tree.push(doc);
      }
    });

    this.filteredDocuments = tree;
  }

  private addParentIds(doc: Document, originalMap: Map<number, Document>, includedIds: Set<number>): void {
    let current = doc;
    while (current.parentId) {
      if (!includedIds.has(current.parentId)) {
        includedIds.add(current.parentId);
      }
      const parent = originalMap.get(current.parentId);
      if (!parent) break;
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
    this.safeFullscreenUrl = this.getSafeUrl(doc.fileUrl);
  }

  closeFullscreen(): void {
    this.fullscreenDocument = null;
  }

  getSafeUrl(url: string | null | undefined): SafeResourceUrl | null {
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }
}
