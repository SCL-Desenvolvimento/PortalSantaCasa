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

  constructor(private feedbackService: FeedbackService) { }

  ngOnInit(): void {
    this.loadFeedbackAdmin();
  }

  loadFeedbackAdmin(): void {
    this.feedbackService.getFeedback().subscribe({
      next: (data) => {
        this.feedbacks = data.map((feedback) => ({
          id: feedback.id,
          category: feedback.category,
          createdAt: feedback.createdAt,
          message: feedback.message,
          name: feedback.name,
          status: feedback.status,
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

  deleteFeedback(feedbackId: number): void {
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

  showMessage(message: string, type: string): void {
    this.message = { text: message, type };
    setTimeout(() => {
      this.message = null;
    }, 3000);
  }
}
