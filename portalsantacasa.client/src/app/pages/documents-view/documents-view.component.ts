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

  constructor(private documentService: DocumentService, private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    this.documentService.getDocuments().subscribe({
      next: (data) => {
        this.documents = data.map(document => ({
          ...document,
          fileUrl: document.fileName ? `${environment.imageServerUrl}${document.fileUrl}` : null
        }));
        this.filteredDocuments = this.getRootDocuments();
      },
      error: (error) => {
        console.error('Erro ao carregar documentos:', error);
      }
    });
  }

  getRootDocuments(): Document[] {
    return this.documents.filter(doc => !doc.parentId);
  }

  filterDocuments(): void {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      this.filteredDocuments = this.getRootDocuments();
      return;
    }

    this.filteredDocuments = this.documents.filter(doc =>
      doc.name.toLowerCase().includes(query)
    );
  }

  selectDocument(doc: Document): void {
    if (doc.fileUrl) {
      this.currentDocument = doc;
    }
  }

  clearViewer(): void {
    this.currentDocument = null;
    this.filteredDocuments = this.getRootDocuments();
    this.searchQuery = '';
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
