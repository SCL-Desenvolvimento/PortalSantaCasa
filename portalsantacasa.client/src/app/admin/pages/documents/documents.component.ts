import { Component, OnInit } from '@angular/core';
import { DocumentService } from '../../../services/document.service';
import { Document } from '../../../models/document.model';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-documents',
  standalone: false,
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css'
})
export class DocumentsComponent implements OnInit {
  documents: Document[] = [];
  filteredDocuments: Document[] = [];
  groupedDocuments: Document[] = [];

  modalTitle = '';
  showModal = false;
  isEdit = false;
  isLoading = false;

  expandedItems = new Set<number>();
  selectedDocument: Document | null = null;
  documentForm: Partial<Document> = this.getEmptyDocument();
  documentFile: File | null = null;

  constructor(
    private documentService: DocumentService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadDocumentsAdmin();
  }

  private getEmptyDocument(): Partial<Document> {
    return {
      name: '',
      isActive: true,
      createdAt: ''
    };
  }

  loadDocumentsAdmin(): void {
    this.documentService.getDocuments().subscribe({
      next: (data) => {
        this.documents = data;
        this.filteredDocuments = data.filter(d => !d.fileUrl);
        this.groupedDocuments = this.buildDocumentTree(data);
      },
      error: (err) => this.handleError('Erro ao carregar documentos', err)
    });
  }

  buildDocumentTree(documents: Document[]): Document[] {
    const map = new Map<number, Document & { children?: Document[] }>();
    const roots: Document[] = [];

    documents.forEach(doc => {
      if (doc.id != null) {
        map.set(doc.id, { ...doc });
      }
    });

    for (const doc of documents) {
      if (doc.id == null) continue;
      const current = map.get(doc.id)!;

      if (doc.parentId != null && map.has(doc.parentId)) {
        const parent = map.get(doc.parentId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(current);
      } else {
        roots.push(current);
      }
    }
    return roots;
  }

  toggleExpand(id: number): void {
    this.expandedItems.has(id) ? this.expandedItems.delete(id) : this.expandedItems.add(id);
  }

  isExpanded(id: number): boolean {
    return this.expandedItems.has(id);
  }

  showDocumentForm(documentId?: number): void {
    this.isEdit = !!documentId;
    this.modalTitle = this.isEdit ? 'Editar Item' : 'Novo Item';

    if (documentId) {
      this.documentService.getDocumentById(documentId).subscribe({
        next: (doc) => {
          this.selectedDocument = doc;
          this.documentForm = { ...doc };
          this.openModal();
        },
        error: (err) => this.handleError('Erro ao carregar documento', err)
      });
    } else {
      this.resetForm();
      this.openModal();
    }
  }

  saveDocument(): void {
    if (!this.documentForm.name?.trim()) {
      this.toastr.error('O nome do documento é obrigatório.');
      return;
    }

    const formData = new FormData();
    formData.append('name', this.documentForm.name!);
    if (this.documentForm.parentId != null) {
      formData.append('parentId', this.documentForm.parentId.toString());
    }
    formData.append('isActive', String(this.documentForm.isActive));

    if (this.documentFile) {
      formData.append('file', this.documentFile);
    }

    this.isLoading = true;

    const request = this.isEdit && this.selectedDocument?.id
      ? this.documentService.updateDocument(this.selectedDocument.id, formData)
      : this.documentService.createDocument(formData);

    request.subscribe({
      next: () => {
        this.toastr.success('Documento salvo com sucesso!');
        this.closeModal();
        this.loadDocumentsAdmin();
        this.isLoading = false;
      },
      error: (err) => {
        this.handleError('Erro ao salvar documento', err);
        this.isLoading = false;
      }
    });
  }

  deleteDocument(documentId: number): void {
    Swal.fire({
      title: 'Tem certeza?',
      text: 'Esta ação não poderá ser desfeita!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.documentService.deleteDocument(documentId).subscribe({
          next: () => {
            this.toastr.success('Documento excluído com sucesso!');
            this.loadDocumentsAdmin();
            this.isLoading = false;
          },
          error: (err) => {
            this.handleError('Erro ao excluir documento', err);
            this.isLoading = false;
          }
        });
      }
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.documentFile = input.files[0];
    }
  }

  resetForm(): void {
    this.selectedDocument = null;
    this.documentForm = this.getEmptyDocument();
    this.documentFile = null;
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  private handleError(message: string, error: any): void {
    console.error(error);
    this.toastr.error(message);
  }
}
