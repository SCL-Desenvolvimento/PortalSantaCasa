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
  feedbacks: Feedback[] = [];
  statusFilter: string = '';
  selectedFeedback: Feedback | null = null;
  showModal: boolean = false;
  department: string | null = null;

  // paginação
  currentPage = 1;
  perPage = 10;
  totalPages = 0;

  constructor(
    private feedbackService: FeedbackService,
    private toastr: ToastrService,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.loadFeedbacks();
    this.department = this.authService.getUserInfo('department');
  }

  loadFeedbacks(page: number = 1): void {
    this.feedbackService.getFeedbackPaginated(page, this.perPage).subscribe({
      next: (data) => {
        let filtered = data.feedbacks.filter(f => f.targetDepartment == this.department);

        this.currentPage = data.currentPage;
        this.perPage = data.perPage;
        this.totalPages = data.pages;

        if (this.statusFilter === 'Lido') {
          filtered = filtered.filter(fb => fb.isRead);
        } else if (this.statusFilter === 'NaoLido') {
          filtered = filtered.filter(fb => !fb.isRead);
        }

        this.feedbacks = filtered.map(feedback => ({
          ...feedback
        }));
      },
      error: () => this.toastr.error('Erro ao carregar feedbacks')
    });
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.loadFeedbacks(page);
    }
  }

  openModal(feedback: Feedback): void {
    this.selectedFeedback = feedback;
    this.showModal = true;

    if (!feedback.isRead) {
      this.markAsRead(feedback.id!);
    }
  }

  markAsRead(id: number): void {
    this.feedbackService.markAsRead(id).subscribe({
      next: () => this.loadFeedbacks(this.currentPage),
      error: () => this.toastr.error('Erro ao marcar como lido')
    });
  }

  deleteFeedback(feedbackId: number | undefined): void {
    if (!feedbackId)
      return;

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

  closeModal(): void {
    this.showModal = false;
    this.selectedFeedback = null;
  }
}
