import { Component, OnInit, HostListener, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../services/user.service';
import { FeedbackService } from '../../services/feedbacks.service';

interface SearchResult {
  id: string;
  title: string;
  category: string;
  icon: string;
  type: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  time: Date;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  // Estados do componente
  isLoggedIn = false;
  showLogin = false;
  mostrarTrocaSenha = false;
  userIdParaTroca: number | null = null;
  mobileMenuOpen = false;
  showSearchResults = false;
  showNotifications = false;

  // Dados de login
  loginData = {
    username: '',
    password: ''
  };
  newPassword = '';
  confirmPassword = '';

  // Busca
  searchQuery = '';
  searchResults: SearchResult[] = [];

  // Notificações
  notificationCount = 2;
  notifications: Notification[] = [
    {
      id: '1',
      title: 'Nova notícia publicada',
      message: 'Confira as últimas atualizações da empresa sobre as políticas de trabalho remoto.',
      time: new Date(Date.now() - 30 * 60 * 1000),
      icon: 'fas fa-newspaper',
      color: '#1a8dc3'
    },
    {
      id: '2',
      title: 'Cardápio atualizado',
      message: 'O cardápio desta semana já está disponível. Confira as opções especiais!',
      time: new Date(Date.now() - 2 * 60 * 60 * 1000),
      icon: 'fas fa-utensils',
      color: '#10b981'
    }
  ];

  // Dados de busca mockados
  private searchData: SearchResult[] = [
    { id: '1', title: 'Política de Home Office', category: 'Notícias', icon: 'fas fa-newspaper', type: 'news' },
    { id: '2', title: 'Evento de Integração 2024', category: 'Eventos', icon: 'fas fa-calendar-alt', type: 'event' },
    { id: '3', title: 'Cardápio da Semana', category: 'Cardápio', icon: 'fas fa-utensils', type: 'menu' },
    { id: '4', title: 'Aniversariantes de Janeiro', category: 'Aniversários', icon: 'fas fa-birthday-cake', type: 'birthday' },
    { id: '5', title: 'Reunião Geral', category: 'Eventos', icon: 'fas fa-calendar-alt', type: 'event' },
    { id: '6', title: 'Resultados do Trimestre', category: 'Notícias', icon: 'fas fa-chart-line', type: 'news' }
  ];

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private feedbackService: FeedbackService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.updateNotificationCount();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    // Escape para fechar menus
    if (event.key === 'Escape') {
      this.closeAllPanels();
      this.closeMobileMenu();
    }

    // Ctrl+K para focar na busca
    if (event.ctrlKey && event.key === 'k') {
      event.preventDefault();
      const searchInput = document.querySelector('.search-input') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    if (window.innerWidth > 768 && this.mobileMenuOpen) {
      this.closeMobileMenu();
    }
  }

  // ===== MENU MOBILE =====
  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  // ===== BUSCA =====
  onSearch(event: any): void {
    const query = event.target.value.toLowerCase().trim();

    if (query.length === 0) {
      this.searchResults = [];
      this.showSearchResults = false;
      return;
    }

    if (query.length < 2) {
      return;
    }

    // Simula busca com delay
    setTimeout(() => {
      this.searchResults = this.searchData.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      ).slice(0, 6);

      this.showSearchResults = this.searchResults.length > 0;
    }, 200);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchResults = false;
  }

  closeSearch(): void {
    this.showSearchResults = false;
  }

  selectSearchResult(result: SearchResult): void {
    this.closeSearch();
    this.clearSearch();
    this.toastr.info(`Navegando para: ${result.title}`);
  }

  // ===== NOTIFICAÇÕES =====
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showSearchResults = false;
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  private updateNotificationCount(): void {
    this.notificationCount = this.notifications.length;
  }

  // ===== LOGIN =====
  openLoginModal(): void {
    this.showLogin = true;
    this.closeMobileMenu();
    this.closeAllPanels();
  }

  closeLoginModal(): void {
    this.showLogin = false;
    this.resetForms();
  }

  login(): void {
    if (!this.loginData.username || !this.loginData.password) {
      this.toastr.error('Por favor, preencha todos os campos');
      return;
    }

    this.authService.login(this.loginData.username, this.loginData.password).subscribe({
      next: (res) => {
        if (res.precisaTrocarSenha) {
          this.userIdParaTroca = res.userId;
          this.mostrarTrocaSenha = true;
        } else {
          this.isLoggedIn = true;
          this.router.navigate(['/admin']);
          this.closeLoginModal();
          this.toastr.success('Login realizado com sucesso!');
        }
      },
      error: () => {
        this.toastr.error('Usuário ou senha inválidos.');
      }
    });
  }

  changePassword(): void {
    if (this.newPassword !== this.confirmPassword) {
      this.toastr.error('As senhas não coincidem');
      return;
    }

    if (!this.userIdParaTroca) return;

    this.userService.changePassword(this.userIdParaTroca, this.newPassword).subscribe({
      next: () => {
        this.toastr.success('Senha alterada com sucesso! Faça login novamente.');
        this.resetForms();
      },
      error: () => {
        this.toastr.error('Erro ao alterar senha');
      }
    });
  }

  goToAdmin(): void {
    this.router.navigate(['/admin']);
  }

  // ===== FEEDBACK =====
  openFeedbackModal(): void {
    this.feedbackService.open();
    this.closeMobileMenu();
    this.closeAllPanels();
  }

  // ===== UTILITÁRIOS =====
  closeAllPanels(): void {
    this.showNotifications = false;
    this.showSearchResults = false;
  }

  private resetForms(): void {
    this.mostrarTrocaSenha = false;
    this.userIdParaTroca = null;
    this.loginData = { username: '', password: '' };
    this.newPassword = '';
    this.confirmPassword = '';
  }
}

