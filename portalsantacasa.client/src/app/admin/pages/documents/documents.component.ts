import { Component, OnInit } from '@angular/core';
import { DocumentService } from '../../../services/document.service';
import { Document } from '../../../models/document.model'

@Component({
  selector: 'app-documents',
  standalone: false,
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css'
})
export class DocumentsComponent implements OnInit {
  documents: Document[] = [];
  modalTitle: string = '';
  showModal: boolean = false;
  isEdit: boolean = false;
  selectedDocument: Document | null = null;
  documentForm: Document = { name: '', isActive: true, createdAt: '' };
  documentFile: File | null = null;
  message: { text: string, type: string } | null = null;

  constructor(private documentService: DocumentService) { }

  ngOnInit(): void {
    this.loadDocumentsAdmin();
  }

  loadDocumentsAdmin(): void {
    this.documentService.getDocuments().subscribe({
      next: (data) => {
        this.documents = data;
      },
      error: (error) => {
        this.showMessage(`Erro ao carregar documentos: ${error.message}`, 'error');
      }
    });
  }

  showDocumentForm(documentId: number | null = null): void {
    this.isEdit = documentId !== null;
    this.modalTitle = this.isEdit ? 'Editar Item' : 'Novo Item';
    if (documentId) {
      this.documentService.getDocumentById(documentId).subscribe({
        next: (doc) => {
          this.selectedDocument = doc;
          this.documentForm = { ...doc };
          this.openModal();
        },
        error: (error) => {
          this.showMessage(`Erro ao carregar documento: ${error.message}`, 'error');
        }
      });
    } else {
      this.selectedDocument = null;
      this.documentForm = { name: '', isActive: true, createdAt: '' };
      this.documentFile = null;
      this.openModal();
    }
  }

  saveDocument(): void {
    const formData = new FormData();
    formData.append('name', this.documentForm.name);
    formData.append('parent_id', this.documentForm.parent_id?.toString() || 'none');
    formData.append('isActive', this.documentForm.isActive.toString());
    if (this.documentFile) {
      formData.append('file', this.documentFile);
    }
    const request = this.isEdit && this.selectedDocument?.id
      ? this.documentService.updateDocument(this.selectedDocument.id, formData)
      : this.documentService.createDocument(formData);
    request.subscribe({
      next: (data) => {
        this.closeModal();
        this.showMessage(data.message, 'success');
        this.loadDocumentsAdmin();
      },
      error: (error) => {
        this.showMessage(error.message || 'Erro ao salvar documento', 'error');
      }
    });
  }

  deleteDocument(documentId?: number): void {
    if (!documentId) {
      console.warn('ID inválido ao tentar deletar documento.');
      return;
    }

    if (confirm('Tem certeza que deseja excluir este item?')) {
      this.documentService.deleteDocument(documentId).subscribe({
        next: (data) => {
          this.showMessage(data.message, 'success');
          this.loadDocumentsAdmin();
        },
        error: (error) => {
          this.showMessage(error.message || 'Erro ao excluir documento', 'error');
        }
      });
    }
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }

  onFileChange(event: Event, type: 'image' | 'document' | 'photo'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      if (type === 'document') {
        this.documentFile = input.files[0];
      }
    }
  }
}
