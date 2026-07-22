// feedback-modal.component.ts
import { Component, OnInit } from '@angular/core';
import { FeedbackService } from '../../../core/services/feedbacks.service';
import { Feedback } from '../../../models/feedback.model';
import { DEPARTMENTS } from '../../constants/departments.constants';

@Component({
  selector: 'app-feedback-modal',
  standalone: false,
  templateUrl: './feedback-modal.component.html',
  styleUrls: ['./feedback-modal.component.css']
})
export class FeedbackModalComponent implements OnInit {
  isOpen = false;

  feedback: Feedback = this.resetFeedbackModal();

  // Departamentos
  departments: string[] = DEPARTMENTS;

  departmentsTarget: string[] = ["Informática"];

  constructor(private feedbackModalService: FeedbackService) { }

  ngOnInit(): void {
    this.feedbackModalService.modalState$.subscribe(state => {
      this.isOpen = state;
    });
  }

  close() {
    this.feedbackModalService.close();
  }

  sendFeedback(): void {
    // Validação básica
    if (!this.feedback.name || !this.feedback.department || !this.feedback.category ||
      !this.feedback.targetDepartment || !this.feedback.subject || !this.feedback.message) {
      console.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    const formData = new FormData();
    formData.append('name', this.feedback.name);
    formData.append('message', this.feedback.message);
    formData.append('email', this.feedback.email || '');
    formData.append('department', this.feedback.department || '');
    formData.append('targetDepartment', this.feedback.targetDepartment || '');
    formData.append('category', this.feedback.category);
    formData.append('subject', this.feedback.subject);

    this.feedbackModalService.createFeedback(formData).subscribe({
      next: (data) => {
        this.close();
      },
      error: (error) => {
        console.error('Erro ao enviar sugestão', error);
      }
    });
  }

  resetFeedbackModal(): Feedback {
    return {
      name: '',
      email: '',
      department: '',
      category: '',
      targetDepartment: '',
      subject: '',
      message: '',
      isRead: false,
      createdAt: ''
    };
  }

}
