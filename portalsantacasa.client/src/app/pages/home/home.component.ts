import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  constructor(private router: Router) { }

  showLogin = false;
  showFeedback = false;

  loginData = {
    username: '',
    password: ''
  };

  feedback = {
    nome: '',
    email: '',
    departamento: '',
    categoria: '',
    assunto: '',
    mensagem: ''
  };

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
      action: () => this.navegar('/feedback')
    }
  ];

  navegar(rota: string): void {
    this.router.navigate([`/${rota}`]);
  }
  openLoginModal() {
    this.showLogin = true;
  }

  closeLoginModal() {
    this.showLogin = false;
  }

  login() {
    console.log(this.loginData);
    this.closeLoginModal();
  }

  openFeedbackModal() {
    this.showFeedback = true;
  }

  closeFeedbackModal() {
    this.showFeedback = false;
  }

  sendFeedback() {
    console.log(this.feedback);
    this.closeFeedbackModal();
  }

  loadNews() {
    alert('Carregar notícias...');
  }

  goToDocuments() {
    window.location.href = '/documents';
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
