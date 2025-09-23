import { Component, OnInit } from '@angular/core';
import { DocumentService } from '../../../services/document.service';
import { Document } from '../../../models/document.model';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-documents',
  standalone: false,
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css'
})
export class DocumentsComponent implements OnInit {
  documentsList: Document[] = [];
  filteredDocuments: Document[] = [];
  groupedDocuments: Document[] = [];
  availableParents: Document[] = [];

  totalCategories = 0;
  totalDocuments = 0;
  activeDocuments = 0;

  modalTitle = '';
  showModal = false;
  isEdit = false;
  isLoading = false;

  expandedItems = new Set<number>();
  selectedDocument: Document | null = null;
  documentForm: Partial<Document> = this.getEmptyDocument();
  documentFile: File | null = null;

  // Paginação
  currentPage = 1;
  perPage = 10;
  totalPages = 0;

  // Filtros e busca
  searchTerm = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  constructor(
    private documentService: DocumentService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.loadDocuments();
  }

  private getEmptyDocument(): Partial<Document> {
    return {
      name: '',
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0]
    };
  }

  // =====================
  // 📌 CRUD
  // =====================
  loadDocuments(page: number = 1): void {
    this.documentService.getDocuments().subscribe({
      next: (data) => {
        this.documentsList = data.map(d => ({
          ...d,
          fileUrl: d.fileUrl ? `${environment.serverUrl}${d.fileUrl}` : d.fileUrl
        }));

        this.updateStatistics();
        this.applyFilters();
        this.updatePagination();
      },
      error: (err) => this.handleError('Erro ao carregar documentos', err)
    });
  }

  private updateStatistics(): void {
    this.totalCategories = this.documentsList.filter(d => !d.fileUrl).length;
    this.totalDocuments = this.documentsList.filter(d => d.fileUrl).length;
    this.activeDocuments = this.documentsList.filter(d => d.isActive && d.fileUrl).length;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.documentFile = input.files[0];
      this.documentForm.fileName = this.documentFile.name; // Update filename for display
    }
  }

  saveDocument(): void {
    if (!this.documentForm.name?.trim()) {
      this.toastr.error('O nome do item é obrigatório.');
      return;
    }

    this.isLoading = true;

    const formData = new FormData();
    formData.append('name', this.documentForm.name!);
    formData.append('isActive', String(this.documentForm.isActive));

    // Fix parentId handling - only append if it has a valid value
    if (this.documentForm.parentId != null && this.documentForm.parentId !== 0) {
      formData.append('parentId', this.documentForm.parentId.toString());
    }

    if (this.documentFile) {
      formData.append('file', this.documentFile, this.documentFile.name);
    }

    const request = this.isEdit && this.selectedDocument?.id
      ? this.documentService.updateDocument(this.selectedDocument.id, formData)
      : this.documentService.createDocument(formData);

    request.subscribe({
      next: () => {
        this.toastr.success('Item salvo com sucesso!');
        this.closeModal();
        this.loadDocuments();
        this.isLoading = false;
      },
      error: (err) => {
        this.handleError('Erro ao salvar item', err);
        this.isLoading = false;
      }
    });
  }

  deleteDocument(documentId: number): void {
    Swal.fire({
      title: 'Tem certeza?',
      text: 'Esta ação não poderá ser desfeita! Isso também excluirá subitens.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.documentService.deleteDocument(documentId).subscribe({
          next: () => {
            this.toastr.success('Item excluído com sucesso!');
            this.loadDocuments();
            this.isLoading = false;
          },
          error: (err) => {
            this.handleError('Erro ao excluir item', err);
            this.isLoading = false;
          }
        });
      }
    });
  }

  toggleDocumentStatus(doc: Document): void {
    if (!doc.id) return;

    const newStatus = !doc.isActive;
    const formData = new FormData();
    formData.append('name', doc.name);
    formData.append('isActive', String(newStatus));

    // Fix parentId handling - only append if it has a valid value
    if (doc.parentId != null  && doc.parentId !== 0) {
      formData.append('parentId', doc.parentId.toString());
    }

    this.documentService.updateDocument(doc.id, formData).subscribe({
      next: () => {
        doc.isActive = newStatus;
        this.updateStatistics();
        this.applyFilters();
        this.toastr.success(`Status atualizado para ${newStatus ? 'Ativo' : 'Inativo'}`);
      },
      error: (err) => this.handleError('Erro ao atualizar status', err)
    });
  }

  // =====================
  // 📌 Modal
  // =====================
  showDocumentForm(documentId?: number): void {
    this.isEdit = !!documentId;
    this.modalTitle = this.isEdit ? 'Editar Item' : 'Novo Item';

    if (documentId) {
      this.documentService.getDocumentById(documentId).subscribe({
        next: (doc) => {
          this.selectedDocument = doc;
          this.documentForm = { ...doc };
          this.documentForm.createdAt = this.formatDate(doc.createdAt); // Format date for input
          this.documentFile = null; // Clear selected file on edit
          this.updateAvailableParents(documentId);
          this.openModal();
        },
        error: (err) => this.handleError('Erro ao carregar item', err)
      });
    } else {
      this.resetForm();
      this.updateAvailableParents();
      this.openModal();
    }
  }

  openModal(): void {
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.selectedDocument = null;
    this.documentForm = this.getEmptyDocument();
    this.documentFile = null;
  }

  private updateAvailableParents(currentDocId?: number): void {
    // Only categories (items without fileUrl) can be parents
    this.availableParents = this.documentsList.filter(doc => !doc.fileUrl && doc.id !== currentDocId);
  }

  // =====================
  // 📌 Busca e filtros
  // =====================
  onSearch(): void {
    this.applyFilters();
  }

  setStatusFilter(filter: 'all' | 'active' | 'inactive'): void {
    this.statusFilter = filter;
    this.applyFilters();
  }

  private applyFilters(): void {
    let tempFiltered: Document[] = [];

    if (!this.searchTerm && this.statusFilter === 'all') {
      // Se não há filtros, mostra todos os documentos
      tempFiltered = [...this.documentsList];
    } else {
      // Aplica filtros e inclui filhos quando o pai corresponde
      tempFiltered = this.getFilteredDocumentsWithChildren();

      // Auto-expande pastas que contêm resultados filtrados
      this.autoExpandFilteredParents(tempFiltered);
    }

    // Set filteredDocuments for the template to use
    this.filteredDocuments = tempFiltered;

    // Rebuild tree structure for filtered results
    this.groupedDocuments = this.buildDocumentTree(tempFiltered);
    this.updatePagination();
  }

  private autoExpandFilteredParents(filteredDocs: Document[]): void {
    // Encontra todos os pais que têm filhos nos resultados filtrados
    const parentsToExpand = new Set<number>();

    filteredDocs.forEach(doc => {
      if (doc.parentId) {
        let currentParentId = doc.parentId;

        // Expande toda a cadeia de pais até a raiz
        while (currentParentId) {
          parentsToExpand.add(currentParentId);
          const parent = this.documentsList.find(d => d.id === currentParentId);
          currentParentId = parent?.parentId || 0;
        }
      }
    });

    // Adiciona os pais à lista de itens expandidos
    parentsToExpand.forEach(parentId => {
      this.expandedItems.add(parentId);
    });
  }

  private getFilteredDocumentsWithChildren(): Document[] {
    const result: Document[] = [];
    const addedIds = new Set<number>();

    // Função para adicionar um documento e todos os seus filhos
    const addDocumentWithChildren = (doc: Document) => {
      if (doc.id && !addedIds.has(doc.id)) {
        result.push(doc);
        addedIds.add(doc.id);

        // Adiciona todos os filhos
        const children = this.documentsList.filter(d => d.parentId === doc.id);
        children.forEach(child => addDocumentWithChildren(child));
      }
    };

    // Função para adicionar um documento e todos os seus pais
    const addDocumentWithParents = (doc: Document) => {
      if (doc.id && !addedIds.has(doc.id)) {
        result.push(doc);
        addedIds.add(doc.id);

        // Adiciona o pai se existir
        if (doc.parentId) {
          const parent = this.documentsList.find(d => d.id === doc.parentId);
          if (parent) {
            addDocumentWithParents(parent);
          }
        }
      }
    };

    // Primeiro, encontra todos os documentos que correspondem aos filtros
    for (const doc of this.documentsList) {
      const matchesSearch = !this.searchTerm ||
        doc.name.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && doc.isActive) ||
        (this.statusFilter === 'inactive' && !doc.isActive);

      if (matchesSearch && matchesStatus) {
        // Se o documento corresponde aos filtros, adiciona ele e seus filhos
        addDocumentWithChildren(doc);

        // Também adiciona todos os pais para manter a hierarquia
        addDocumentWithParents(doc);
      }
    }

    return result;
  }

  // =====================
  // 📌 Paginação
  // =====================
  private updatePagination(): void {
    // For tree-like structures, pagination is usually applied to the top-level items
    // or a flat list. For simplicity, let's paginate the top-level groupedDocuments.
    const startIndex = (this.currentPage - 1) * this.perPage;
    const endIndex = startIndex + this.perPage;
    // This pagination logic needs to be carefully considered for tree structures.
    // For now, it will paginate the top-level items after filtering.
    // If sub-items also need pagination, a more complex logic is required.
    this.totalPages = Math.ceil(this.groupedDocuments.length / this.perPage);
    // If you want to paginate the flat filtered list, use this:
    // this.totalPages = Math.ceil(this.filteredDocuments.length / this.perPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.applyFilters(); // Re-apply filters to get the correct page of grouped documents
    }
  }

  // =====================
  // 📌 Helpers para árvore
  // =====================
  buildDocumentTree(documents: Document[]): Document[] {
    const map = new Map<number, Document & { children?: Document[] }>();
    const roots: Document[] = [];

    documents.forEach(doc => {
      if (doc.id != null) {
        map.set(doc.id, { ...doc });
      }
    });

    // First, add all documents to the map and initialize children array
    documents.forEach(doc => {
      if (doc.id != null) {
        const current = map.get(doc.id)!;
        if (!current.children) current.children = [];
      }
    });

    // Then, build the tree structure
    for (const doc of documents) {
      if (doc.id == null) continue;
      const current = map.get(doc.id)!;

      if (doc.parentId != null && map.has(doc.parentId)) {
        const parent = map.get(doc.parentId)!;
        // Ensure parent.children is initialized before pushing
        if (!parent.children) parent.children = [];
        parent.children.push(current);
      } else {
        roots.push(current);
      }
    }

    // Sort roots and their children by name for consistent display
    roots.sort((a, b) => a.name.localeCompare(b.name));
    roots.forEach(root => this.sortChildren(root));

    return roots;
  }

  private sortChildren(doc: Document & { children?: Document[] }): void {
    if (doc.children) {
      doc.children.sort((a, b) => a.name.localeCompare(b.name));
      doc.children.forEach(child => this.sortChildren(child));
    }
  }

  toggleExpand(id: number): void {
    if (this.expandedItems.has(id)) {
      this.expandedItems.delete(id);
    } else {
      this.expandedItems.add(id);
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedItems.has(id);
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  private handleError(message: string, error: any): void {
    console.error(error);
    this.toastr.error(message);
  }
}


