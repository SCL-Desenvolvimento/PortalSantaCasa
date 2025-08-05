import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FeedbackService } from '../../services/feedbacks.service';
import { Feedback } from '../../models/feedback.model';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  constructor(private router: Router, private feedbackService: FeedbackService) { }

  showFeedback = false;
  feedback: Feedback = this.resetFeedbackModal();

  resetFeedbackModal() {
    return {
      name: '',
      email: '',
      department: '',
      category: '',
      subject: '',
      message: '',
      isRead: false,
      createdAt: ''
    };
  }

  cards = [
    {
      title: 'Notícias',
      description: 'Fique por dentro das últimas novidades da empresa',
      icon: 'fas fa-newspaper',
      iconColor: 'text-primary',
      buttonText: 'Ver Notícias',
      btnClass: 'bg-primary',
      action: () => this.navegar('/noticias')
    },
    {
      title: 'Documentos',
      description: 'Acesse documentos importantes e formulários',
      icon: 'fas fa-file-alt',
      iconColor: 'text-success',
      buttonText: 'Ver Documentos',
      btnClass: 'bg-success',
      action: () => this.navegar('/documentos')
    },
    {
      title: 'Aniversariantes',
      description: 'Comemore com os aniversariantes do mês',
      icon: 'fas fa-birthday-cake',
      iconColor: 'text-pink',
      buttonText: 'Ver Aniversariantes',
      btnClass: 'bg-pink',
      action: () => this.navegar('/aniversariantes')
    },
    {
      title: 'Cardápio',
      description: 'Confira o cardápio da semana',
      icon: 'fas fa-utensils',
      iconColor: 'text-dark',
      buttonText: 'Ver Cardápio',
      btnClass: 'bg-dark',
      action: () => this.navegar('/cardapio')
    },
    {
      title: 'Eventos',
      description: 'Veja os próximos eventos e atividades',
      icon: 'fas fa-calendar-alt',
      iconColor: 'text-purple',
      buttonText: 'Ver Eventos',
      btnClass: 'bg-purple',
      action: () => this.navegar('/eventos')
    },
    {
      title: 'Feedback',
      description: 'Envie suas sugestões e comentários',
      icon: 'fas fa-comments',
      iconColor: 'text-indigo',
      buttonText: 'Enviar Feedback',
      btnClass: 'bg-indigo',
      action: () => this.openFeedbackModal()
    }
  ];

  navegar(rota: string): void {
    this.router.navigate([`/${rota}`]);
  }

  openFeedbackModal() {
    this.showFeedback = true;
  }

  closeFeedbackModal() {
    this.showFeedback = false;
  }

  sendFeedback() {
    const formData = new FormData();
    formData.append('name', this.feedback.name);
    formData.append('message', this.feedback.message);
    formData.append('email', this.feedback.email || '');
    formData.append('department', this.feedback.department || '');
    formData.append('category', this.feedback.category);
    formData.append('subject', this.feedback.subject);


    this.feedbackService.createFeedback(formData).subscribe({
      next: (data) => {
        this.closeFeedbackModal();
      },
      error: (error) => {

      }
    })
  }

  loadNews() {
    alert('Carregar notícias...');
  }

  loadBirthdays() {
    alert('Carregar aniversariantes...');
  }

  loadMenu() {
    alert('Carregar cardápio...');
  }

  loadEvents() {
    alert('Carregar eventos...');
  }
}
