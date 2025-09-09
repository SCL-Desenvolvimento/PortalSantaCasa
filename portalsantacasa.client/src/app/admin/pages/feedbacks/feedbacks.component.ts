import { Component, OnInit } from '@angular/core';
import { FeedbackService } from '../../../services/feedbacks.service';
import { Feedback } from '../../../models/feedback.model';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-feedbacks',
  standalone: false,
  templateUrl: './feedbacks.component.html',
  styleUrls: ['./feedbacks.component.css']
})
export class FeedbacksComponent implements OnInit {
  // =====================
  // 📌 Dados principais
  // =====================
  feedbacksList: Feedback[] = [];
  filteredFeedbacks: Feedback[] = [];

  totalFeedbacks = 0;
  readFeedbacks = 0;
  unreadFeedbacks = 0;

  // Filtros e busca
  searchTerm = '';
  statusFilter: boolean | null = null; // null: todos, true: lidos, false: não lidos
  categoryFilter: string | null = null;
  uniqueCategories: string[] = [];

  // Modal
  selectedFeedback: Feedback | null = null;
  showModal = false;

  // Paginação
  currentPage = 1;
  perPage = 10;
  totalPages = 0;

  department: string | null = null;

  constructor(
    private feedbackService: FeedbackService,
    private toastr: ToastrService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.department = this.authService.getUserInfo('department');
    this.loadFeedbacks();
  }

  // =====================
  // 📌 CRUD e Carregamento
  // =====================
  loadFeedbacks(page: number = 1): void {
    this.feedbackService.getFeedbackPaginated(page, this.perPage).subscribe({
      next: (data) => {
        this.feedbacksList = data.feedbacks.filter(f => f.targetDepartment == this.department);

        this.currentPage = data.currentPage;
        this.perPage = data.perPage;
        this.totalPages = data.pages;

        this.updateStatistics();
        this.extractUniqueCategories();
        this.applyFilters();
      },
      error: () => this.toastr.error('Erro ao carregar feedbacks')
    });
  }

  private updateStatistics(): void {
    this.totalFeedbacks = this.feedbacksList.length;
    this.readFeedbacks = this.feedbacksList.filter(fb => fb.isRead).length;
    this.unreadFeedbacks = this.totalFeedbacks - this.readFeedbacks;
  }

  private extractUniqueCategories(): void {
    const categories = new Set<string>();
    this.feedbacksList.forEach(fb => categories.add(fb.category));
    this.uniqueCategories = Array.from(categories).sort();
  }

  // =====================
  // 📌 Modal
  // =====================
  openModal(feedback: Feedback): void {
    this.selectedFeedback = feedback;
    this.showModal = true;

    if (!feedback.isRead) {
      this.markAsRead(feedback.id!); // Marca como lido ao abrir o modal
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedFeedback = null;
  }

  // =====================
  // 📌 Ações de Feedback
  // =====================
  markAsRead(id: number): void {
    this.feedbackService.markAsRead(id).subscribe({
      next: () => {
        const index = this.feedbacksList.findIndex(fb => fb.id === id);
        if (index !== -1) {
          this.feedbacksList[index].isRead = true;
          this.updateStatistics();
          this.applyFilters();
          this.toastr.success('Feedback marcado como lido');
        }
      },
      error: () => this.toastr.error('Erro ao marcar como lido')
    });
  }

  toggleReadStatus(feedback: Feedback | null): void {
    if (!feedback || !feedback.id) return;

    const newStatus = !feedback.isRead;

    this.feedbackService.markAsRead(feedback.id).subscribe({
      next: () => {
        feedback.isRead = newStatus;
        this.updateStatistics();
        this.applyFilters();
        this.toastr.success(`Feedback marcado como ${newStatus ? 'lido' : 'não lido'}`);
      },
      error: () => this.toastr.error('Erro ao atualizar status')
    });
  }

  deleteFeedback(feedbackId: number | undefined): void {
    if (!feedbackId) return;

    Swal.fire({
      title: 'Tem certeza?',
      text: 'Você não poderá reverter esta ação!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.feedbackService.deleteFeedback(feedbackId).subscribe({
          next: () => {
            this.loadFeedbacks(this.currentPage);
            this.toastr.success('Feedback removido com sucesso');
          },
          error: () => this.toastr.error('Erro ao excluir feedback')
        });
      }
    });
  }

  // =====================
  // 📌 Busca e filtros
  // =====================
  onSearch(): void {
    this.applyFilters();
  }

  setStatusFilter(status: boolean | null): void {
    this.statusFilter = status;
    this.applyFilters();
  }

  setCategoryFilter(category: string | null): void {
    this.categoryFilter = category;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredFeedbacks = this.feedbacksList.filter(feedback => {
      const matchesSearch =
        !this.searchTerm ||
        feedback.subject.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        feedback.message.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        feedback.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        feedback.category.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        feedback.targetDepartment.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus =
        this.statusFilter === null ||
        feedback.isRead === this.statusFilter;

      const matchesCategory =
        this.categoryFilter === null ||
        feedback.category === this.categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }

  // =====================
  // 📌 Paginação
  // =====================
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.loadFeedbacks(page);
    }
  }
}


