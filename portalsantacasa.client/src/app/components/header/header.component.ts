import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { UserService } from '../../core/services/user.service';
import { FeedbackService } from '../../core/services/feedbacks.service';
import { SearchResult, SearchService } from '../../core/services/search.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';

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
export class HeaderComponent implements OnInit, OnDestroy {
  readonly homeRoute = '/';

  // Estados do componente
  isLoggedIn = false;
  showLogin = false;
  mostrarTrocaSenha = false;
  userIdParaTroca: number | null = null;
  tokenTrocaSenha: string | null = null;
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
  isSearching = false;
  hasSearched = false;
  private readonly searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

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

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private feedbackService: FeedbackService,
    private searchService: SearchService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    this.isLoggedIn = this.authService.isLoggedIn();
    this.updateNotificationCount();
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(query => {
        this.isSearching = true;
        this.hasSearched = false;
        return this.searchService.publicSearch(query).pipe(finalize(() => this.isSearching = false));
      })
    ).subscribe(results => {
      if (this.searchQuery.trim().length < 2) return;
      this.searchResults = results;
      this.hasSearched = true;
      this.showSearchResults = true;
    });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
    this.searchSubject.complete();
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

  goToHome(): void {
    this.closeMobileMenu();
    this.closeAllPanels();
    this.router.navigate([this.homeRoute]);
  }

  // ===== BUSCA =====
  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value.trim();

    if (query.length === 0) {
      this.searchResults = [];
      this.showSearchResults = false;
      this.hasSearched = false;
      return;
    }

    if (query.length < 2) {
      this.searchResults = [];
      this.showSearchResults = false;
      return;
    }

    this.showSearchResults = true;
    this.searchSubject.next(query);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchResults = false;
    this.hasSearched = false;
  }

  closeSearch(): void {
    this.showSearchResults = false;
  }

  selectSearchResult(result: SearchResult): void {
    this.clearSearch();
    if (!result.url) return;

    if (result.isExternal) {
      window.open(result.url, '_blank', 'noopener,noreferrer');
      return;
    }

    void this.router.navigateByUrl(result.url);
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
          this.tokenTrocaSenha = res.token;
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

    if (!this.userIdParaTroca || !this.tokenTrocaSenha) return;

    this.userService.changePassword(this.userIdParaTroca, this.newPassword, this.tokenTrocaSenha).subscribe({
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
    this.tokenTrocaSenha = null;
    this.loginData = { username: '', password: '' };
    this.newPassword = '';
    this.confirmPassword = '';
  }
}

