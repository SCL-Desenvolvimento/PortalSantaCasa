import { Component } from '@angular/core';
import { DocumentService } from '../../services/document.service';
import { Document } from '../../models/document.model';
import { environment } from '../../../environments/environment';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-documentsView',
  standalone: false,
  templateUrl: './documentsView.component.html',
  styleUrl: './documentsView.component.css'
})
export class documentsViewComponent {
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
        this.filteredDocuments = this.documents.filter((doc) => !doc.parentId);
      },
      error: (error) => {
        console.error('Erro ao carregar documentos:', error);
      }
    });
  }

  filterDocuments(): void {
    if (!this.searchQuery) {
      this.filteredDocuments = this.documents.filter((doc) => !doc.parentId);
      return;
    }
    this.filteredDocuments = this.documents.filter((doc) =>
      doc.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  selectDocument(doc: Document): void {
    if (doc.fileUrl) {
      this.currentDocument = doc;
    } else {
      this.filteredDocuments = this.documents.filter(
        (d) => d.parentId === doc.id
      );
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
