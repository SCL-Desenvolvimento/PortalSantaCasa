import { Component } from '@angular/core';
import { DocumentService, Document } from './document.service';

@Component({
  selector: 'app-documents',
  standalone: false,
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css'
})
export class DocumentsComponent {
  documents: Document[] = [];
  filteredDocuments: Document[] = [];
  currentDocument: Document | null = null;
  fullscreenDocument: Document | null = null;
  searchQuery: string = '';

  constructor(private documentService: DocumentService) { }

  ngOnInit(): void {
    this.documentService.getDocuments().subscribe(
      (data) => {
        this.documents = data.documents;
        this.filteredDocuments = this.documents.filter((doc) => !doc.parent_id);
      },
      (error) => {
        console.error('Erro ao carregar documentos:', error);
      }
    );
  }

  filterDocuments(): void {
    if (!this.searchQuery) {
      this.filteredDocuments = this.documents.filter((doc) => !doc.parent_id);
      return;
    }
    this.filteredDocuments = this.documents.filter((doc) =>
      doc.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  selectDocument(doc: Document): void {
    if (doc.file_url) {
      this.currentDocument = doc;
    } else {
      this.filteredDocuments = this.documents.filter(
        (d) => d.parent_id === doc.id
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
}
