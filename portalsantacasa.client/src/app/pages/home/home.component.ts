import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
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
      iconColor: 'text-blue-500',
      buttonText: 'Ver Notícias',
      buttonClass: 'bg-blue-500 hover:bg-blue-600',
      action: () => this.loadNews()
    },
    {
      title: 'Documentos',
      description: 'Acesse documentos importantes e formulários',
      icon: 'fas fa-file-alt',
      iconColor: 'text-green-500',
      buttonText: 'Ver Documentos',
      buttonClass: 'bg-green-500 hover:bg-green-600',
      action: () => this.goToDocuments()
    },
    {
      title: 'Aniversariantes',
      description: 'Comemore com os aniversariantes do mês',
      icon: 'fas fa-birthday-cake',
      iconColor: 'text-pink-500',
      buttonText: 'Ver Aniversariantes',
      buttonClass: 'bg-pink-500 hover:bg-pink-600',
      action: () => this.loadBirthdays()
    },
    {
      title: 'Cardápio',
      description: 'Confira o cardápio da semana',
      icon: 'fas fa-utensils',
      iconColor: 'text-orange-500',
      buttonText: 'Ver Cardápio',
      buttonClass: 'bg-orange-500 hover:bg-orange-600',
      action: () => this.loadMenu()
    },
    {
      title: 'Eventos',
      description: 'Veja os próximos eventos e atividades',
      icon: 'fas fa-calendar-alt',
      iconColor: 'text-purple-500',
      buttonText: 'Ver Eventos',
      buttonClass: 'bg-purple-500 hover:bg-purple-600',
      action: () => this.loadEvents()
    },
    {
      title: 'Feedback',
      description: 'Envie suas sugestões e comentários',
      icon: 'fas fa-comments',
      iconColor: 'text-indigo-500',
      buttonText: 'Enviar Feedback',
      buttonClass: 'bg-indigo-500 hover:bg-indigo-600',
      action: () => this.openFeedbackModal()
    }
  ];

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
