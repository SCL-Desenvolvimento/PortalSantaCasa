import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../../services/admin.service';
import { Feedback } from '../../../models/stats.model';

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

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadFeedbackAdmin();
  }

  loadFeedbackAdmin(): void {
    this.adminService.getFeedbacks().subscribe({
      next: (data) => {
        this.feedbacks = data;
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
    this.adminService.updateFeedbackStatus(feedbackId, status).subscribe({
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
      this.adminService.deleteFeedback(feedbackId).subscribe({
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
