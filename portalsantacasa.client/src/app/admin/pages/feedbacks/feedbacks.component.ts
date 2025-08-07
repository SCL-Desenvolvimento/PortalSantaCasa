import { Component, OnInit } from '@angular/core';
import { FeedbackService } from '../../../services/feedbacks.service';
import { Feedback } from '../../../models/feedback.model';

@Component({
  selector: 'app-feedbacks',
  standalone: false,
  templateUrl: './feedbacks.component.html',
  styleUrl: './feedbacks.component.css'
})
export class FeedbacksComponent implements OnInit {
  feedbacks: Feedback[] = [];
  statusFilter: string = '';
  message: { text: string, type: string } | null = null;
  selectedFeedback: Feedback | null = null;
  showModal: boolean = false;

  constructor(private feedbackService: FeedbackService) { }

  ngOnInit(): void {
    this.loadFeedbackAdmin();
  }

  onStatusChange(event: Event, feedbackId: number): void {
    const status = (event.target as HTMLSelectElement).value;
    this.updateFeedbackStatus(feedbackId, status);
  }

  updateFeedbackStatus(feedbackId: number, status: string): void {
    this.feedbackService.updateFeedbackStatus(feedbackId, status).subscribe({
      next: () => {
        this.showMessage('Status atualizado com sucesso', 'success');
        this.loadFeedbackAdmin();
      },
      error: (error) => {
        this.showMessage(error.message || 'Erro ao atualizar status', 'error');
      }
    });
  }

  deleteFeedback(feedbackId: number | undefined): void {
    if (feedbackId) {
      if (confirm('Tem certeza que deseja excluir este feedback?')) {
        this.feedbackService.deleteFeedback(feedbackId).subscribe({
          next: (data) => {
            this.showMessage(data.message, 'success');
            this.loadFeedbackAdmin();
          },
          error: (error) => {
            this.showMessage(error.message || 'Erro ao excluir feedback', 'error');
          }
        });
      }
    }
  }

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }

  loadFeedbackAdmin(): void {
    this.feedbackService.getFeedback().subscribe({
      next: (data) => {
        let filtered = data;

        if (this.statusFilter === 'Lido') {
          filtered = filtered.filter(fb => fb.isRead);
        } else if (this.statusFilter === 'NaoLido') {
          filtered = filtered.filter(fb => !fb.isRead);
        }

        this.feedbacks = filtered.map((feedback) => ({
          id: feedback.id,
          category: feedback.category,
          createdAt: feedback.createdAt,
          message: feedback.message,
          name: feedback.name,
          isRead: feedback.isRead,
          subject: feedback.subject,
          department: feedback.department,
          email: feedback.email
        }));
      },
      error: (error) => {
        this.showMessage(`Erro ao carregar feedbacks: ${error.message}`, 'error');
      }
    });
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
      next: () => this.loadFeedbackAdmin(),
      error: (error) => this.showMessage('Erro ao marcar como lido', 'error')
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedFeedback = null;
  }
}
