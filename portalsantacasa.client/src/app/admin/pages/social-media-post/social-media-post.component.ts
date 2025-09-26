import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PostService } from '../../../core/services/post.service';
import { SocialService } from '../../../core/services/social.service';
import { Post, PostStatus } from '../../../models/post.model';
import { SocialAccount } from '../../../models/social-account.model';
import { environment } from '../../../../environments/environment';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import Swal from 'sweetalert2';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-social-media-post',
  standalone: false,
  templateUrl: './social-media-post.component.html',
  styleUrls: ['./social-media-post.component.css']
})
export class SocialMediaPostComponent implements OnInit {
  // =====================
  // 📌 Dados principais
  // =====================
  postsList: Post[] = [];
  filteredPosts: Post[] = [];
  socialAccounts: SocialAccount[] = [];
  selectedProviders: string[] = [];

  totalPosts = 0;
  publishedPosts = 0;
  scheduledPosts = 0;
  draftPosts = 0;

  // Arquivo de mídia
  selectedFile: File | null = null;
  filePreviewUrl: string | null = null;
  fileType: 'image' | 'video' | null = null;

  // Filtros e busca
  searchTerm = '';
  statusFilter: 'all' | 'published' | 'scheduled' | 'draft' = 'all';
  providerFilter: 'all' | 'facebook' | 'instagram' | 'linkedin' | 'twitter' = 'all';

  // Modal
  modalTitle = '';
  showModal = false;
  showPreviewModal = false;
  isEdit = false;
  isLoading = false;

  // Formulário
  postForm!: FormGroup;
  scheduleType: 'now' | 'schedule' = 'now';

  // Dados do formulário
  postData: Post = this.getEmptyPost();

  // Paginação
  currentPage = 1;
  perPage = 10;
  totalPages = 0;

  // Providers disponíveis
  availableProviders = [
    { value: 'facebook', label: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877f2' },
    { value: 'instagram', label: 'Instagram', icon: 'fab fa-instagram', color: '#e4405f' },
    { value: 'linkedin', label: 'LinkedIn', icon: 'fab fa-linkedin-in', color: '#0077b5' },
    { value: 'twitter', label: 'Twitter', icon: 'fab fa-twitter', color: '#1da1f2' }
  ];

  constructor(
    private fb: FormBuilder,
    private postService: PostService,
    private socialService: SocialService,
    private toastr: ToastrService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadPosts();
    this.loadSocialAccounts();
    this.loadDraftFromStorage();
  }

  private initializeForm(): void {
    this.postForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(500)]],
      message: ['', [Validators.required, Validators.maxLength(4000)]],
      providers: [[], Validators.required],
      scheduledAt: [''],
      isActive: [true]
    });

    // Configurar validação condicional para agendamento
    this.postForm.get('scheduledAt')?.valueChanges.subscribe(value => {
      if (this.scheduleType === 'schedule') {
        this.postForm.get('scheduledAt')?.setValidators([Validators.required]);
      } else {
        this.postForm.get('scheduledAt')?.clearValidators();
      }
      this.postForm.get('scheduledAt')?.updateValueAndValidity();
    });
  }

  private getEmptyPost(): Post {
    return {
      id: 0,
      title: '',
      message: '',
      imageUrl: '',
      providers: [],
      status: PostStatus.Draft,
      scheduledAt: undefined,
      publishedAt: undefined,
      createdAt: '',
      createdByUserId: undefined,
      isActive: true,
      retryCount: 0,
      engagement: {
        likes: 0,
        shares: 0,
        comments: 0,
        views: 0
      }
    };
  }

  // =====================
  // 📌 CRUD Operations
  // =====================
  loadPosts(page: number = this.currentPage): void {
    this.postService.getPostsPaginated(page, this.perPage).subscribe({
      next: (data) => {
        this.postsList = data.posts.map(post => ({
          ...post,
          imageUrl: post.imageUrl ? `${environment.serverUrl}${post.imageUrl}` : ''
        }));

        this.updateStatistics();

        this.currentPage = data.currentPage;
        this.perPage = data.perPage;
        this.totalPages = data.pages;

        this.applyFilters();
      },
      error: () => this.toastr.error('Erro ao carregar publicações')
    });
  }

  loadSocialAccounts(): void {
    this.socialService.getSocialAccounts().subscribe({
      next: (accounts) => {
        this.socialAccounts = accounts;
      },
      error: () => this.toastr.error('Erro ao carregar contas sociais')
    });
  }

  private updateStatistics(): void {
    this.totalPosts = this.postsList.length;
    this.publishedPosts = this.postsList.filter(p => p.status === PostStatus.Published).length;
    this.scheduledPosts = this.postsList.filter(p => p.status === PostStatus.Scheduled).length;
    this.draftPosts = this.postsList.filter(p => p.status === PostStatus.Draft).length;
  }

  savePost(): void {
    if (!this.postForm.valid) {
      this.markFormGroupTouched();
      this.toastr.error('Por favor, corrija os erros no formulário');
      return;
    }

    if (this.selectedProviders.length === 0) {
      this.toastr.error('Selecione pelo menos uma rede social');
      return;
    }

    this.isLoading = true;

    // Criar FormData com todos os campos do formulário
    const formData = this.createFormData();

    // Validar FormData antes do envio
    if (!this.validateFormData(formData)) {
      this.isLoading = false;
      this.toastr.error('Erro na validação dos dados. Verifique o console para mais detalhes.');
      return;
    }

    const request = this.isEdit && this.postData?.id
      ? this.postService.updatePost(this.postData.id, formData)
      : this.postService.createPost(formData);

    request.subscribe({
      next: () => {
        this.isLoading = false;
        this.closeModal();
        this.loadPosts(this.currentPage);
        this.clearDraftFromStorage();

        const message = this.scheduleType === 'now'
          ? 'Publicação realizada com sucesso!'
          : 'Publicação agendada com sucesso!';
        this.toastr.success(message);
      },
      error: (error) => {
        this.isLoading = false;
        this.toastr.error('Erro ao salvar publicação: ' + (error.message || 'Erro desconhecido'));
      }
    });
  }

  /**
   * Cria um objeto FormData com todos os campos necessários para envio
   * Garante que todos os dados do formulário sejam incluídos corretamente
   */
  private createFormData(): FormData {
    const formData = new FormData();

    // Campos obrigatórios do formulário
    const title = this.postForm.get('title')?.value || '';
    const message = this.postForm.get('message')?.value || '';
    const isActive = this.postForm.get('isActive')?.value ?? true;

    formData.append('title', title.trim());
    formData.append('message', message.trim());
    formData.append('providers', JSON.stringify(this.selectedProviders));
    formData.append('isActive', String(isActive));

    // Informações do usuário
    const userId = this.authService.getUserInfo('id');
    if (userId) {
      formData.append('userId', userId.toString());
    }

    // Determinar status baseado no tipo de agendamento
    let status = 'draft';
    const currentDateTime = new Date().toISOString();

    if (this.scheduleType === 'now') {
      status = 'published';
      formData.append('publishedAt', currentDateTime);
    } else if (this.scheduleType === 'schedule') {
      const scheduledValue = this.postForm.get('scheduledAt')?.value;
      if (scheduledValue) {
        status = 'scheduled';
        const scheduledDateTime = new Date(scheduledValue).toISOString();
        formData.append('scheduledAt', scheduledDateTime);
      }
    }

    formData.append('status', status);

    // Timestamps para auditoria
    if (this.isEdit) {
      formData.append('updatedAt', currentDateTime);
      if (this.postData.createdAt) {
        formData.append('createdAt', this.postData.createdAt);
      }
    } else {
      formData.append('createdAt', currentDateTime);
    }

    // Arquivo de mídia (se selecionado)
    if (this.selectedFile) {
      formData.append('file', this.selectedFile, this.selectedFile.name);
      formData.append('fileType', this.selectedFile.type);
      formData.append('fileSize', this.selectedFile.size.toString());
    }

    // Metadados adicionais
    formData.append('platform', 'web');
    formData.append('userAgent', navigator.userAgent);

    // Se for edição, incluir ID do post
    if (this.isEdit && this.postData?.id) {
      formData.append('id', this.postData.id.toString());
    }

    // Log para debug (remover em produção)
    this.logFormDataContents(formData);

    return formData;
  }

  /**
   * Log do conteúdo do FormData para debug
   * Útil para verificar se todos os campos estão sendo enviados corretamente
   */
  private logFormDataContents(formData: FormData): void {
    if (console && console.log) {
      console.log('📤 FormData Contents:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: [File] ${value.name} (${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
    }
  }

  /**
   * Cria FormData para atualizações de posts existentes
   * Preserva todos os dados originais e aplica apenas as mudanças especificadas
   */
  private createUpdateFormData(post: Post, updates: Partial<Post>): FormData {
    const formData = new FormData();

    // Campos básicos do post (usar valores atualizados ou originais)
    formData.append('title', updates.title || post.title);
    formData.append('message', updates.message || post.message);
    formData.append('providers', JSON.stringify(updates.providers || post.providers));
    formData.append('isActive', String(updates.isActive ?? post.isActive));
    formData.append('status', updates?.status?.toString() || post.status.toString());

    // Timestamps
    formData.append('createdAt', post.createdAt);
    formData.append('updatedAt', new Date().toISOString());

    // Campos de agendamento/publicação
    if (updates.publishedAt) {
      formData.append('publishedAt', updates.publishedAt);
    } else if (post.publishedAt) {
      formData.append('publishedAt', post.publishedAt);
    }

    if (updates.scheduledAt) {
      formData.append('scheduledAt', updates.scheduledAt);
    } else if (post.scheduledAt) {
      formData.append('scheduledAt', post.scheduledAt);
    }

    // Informações do usuário
    if (post.createdByUserId) {
      formData.append('userId', post.createdByUserId.toString());
    }

    // ID do post para identificação
    formData.append('id', post.id!.toString());

    // Metadados
    formData.append('platform', 'web');
    formData.append('userAgent', navigator.userAgent);

    // Log para debug
    this.logFormDataContents(formData);

    return formData;
  }

  /**
   * Valida se o FormData contém todos os campos obrigatórios
   * Retorna true se válido, false caso contrário
   */
  private validateFormData(formData: FormData): boolean {
    const requiredFields = ['title', 'message', 'providers', 'status'];

    for (const field of requiredFields) {
      const value = formData.get(field);
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        console.error(`❌ Campo obrigatório ausente ou vazio: ${field}`);
        return false;
      }
    }

    // Validar se providers é um JSON válido
    try {
      const providers = formData.get('providers') as string;
      const parsedProviders = JSON.parse(providers);
      if (!Array.isArray(parsedProviders) || parsedProviders.length === 0) {
        console.error('❌ Providers deve ser um array não vazio');
        return false;
      }
    } catch (error) {
      console.error('❌ Providers não é um JSON válido');
      return false;
    }

    console.log('✅ FormData validado com sucesso');
    return true;
  }

  deletePost(id?: number): void {
    if (!id) return;

    Swal.fire({
      title: 'Tem certeza?',
      text: 'Esta ação não pode ser desfeita!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280'
    }).then((result) => {
      if (result.isConfirmed) {
        this.postService.deletePost(id).subscribe({
          next: () => {
            this.loadPosts(this.currentPage);
            this.toastr.success('Publicação excluída com sucesso');
          },
          error: () => this.toastr.error('Erro ao excluir publicação')
        });
      }
    });
  }

  togglePostStatus(post: Post): void {
    const newStatus = !post.isActive;

    if (!post.id) return;

    const formData = this.createUpdateFormData(post, { isActive: newStatus });

    this.postService.updatePost(post.id, formData).subscribe({
      next: () => {
        post.isActive = newStatus;
        this.updateStatistics();
        this.applyFilters();
        this.toastr.success(`Status atualizado para ${newStatus ? 'Ativo' : 'Inativo'}`);
      },
      error: () => this.toastr.error('Erro ao atualizar status')
    });
  }

  republishPost(post: Post): void {
    if (!post.id) return;

    Swal.fire({
      title: 'Republicar Post',
      text: 'Deseja republicar este post agora?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, republicar!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const formData = this.createUpdateFormData(post, {
          status: PostStatus.Published,
          publishedAt: new Date().toISOString()
        });

        this.postService.updatePost(post.id!, formData).subscribe({
          next: () => {
            this.loadPosts(this.currentPage);
            this.toastr.success('Post republicado com sucesso!');
          },
          error: () => this.toastr.error('Erro ao republicar post')
        });
      }
    });
  }

  // =====================
  // 📌 Modal Management
  // =====================
  showPostModal(postId?: number): void {
    this.isEdit = !!postId;
    this.modalTitle = this.isEdit ? 'Editar Publicação' : 'Nova Publicação';

    if (postId) {
      this.postService.getPostById(postId).subscribe({
        next: (post) => {
          this.postData = {
            ...post,
            imageUrl: post.imageUrl ? `${environment.serverUrl}${post.imageUrl}` : ''
          };

          this.postForm.patchValue({
            title: post.title,
            message: post.message,
            providers: post.providers,
            scheduledAt: post.scheduledAt ? this.formatDateTimeLocal(post.scheduledAt) : '',
            isActive: post.isActive
          });

          this.selectedProviders = [...post.providers];
          this.scheduleType = post.scheduledAt ? 'schedule' : 'now';

          if (post.imageUrl) {
            this.filePreviewUrl = post.imageUrl;
            this.fileType = this.getFileType(post.imageUrl);
          }

          this.openModal();
        },
        error: () => this.toastr.error('Erro ao carregar publicação')
      });
    } else {
      this.resetForm();
      this.openModal();
    }
  }

  openModal(): void {
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    this.showPreviewModal = false;
    document.body.style.overflow = 'auto';
    this.resetForm();
  }

  resetForm(): void {
    this.postData = this.getEmptyPost();
    this.postForm.reset({
      title: '',
      message: '',
      providers: [],
      scheduledAt: '',
      isActive: true
    });
    this.selectedProviders = [];
    this.scheduleType = 'now';
    this.selectedFile = null;
    this.filePreviewUrl = null;
    this.fileType = null;
    this.isEdit = false;
    this.isLoading = false;
  }

  // =====================
  // 📌 File Management
  // =====================
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      const file = input.files[0];

      if (this.validateFile(file)) {
        this.selectedFile = file;
        this.generateFilePreview(file);
      }
    }
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer?.files;
    if (files?.length) {
      const file = files[0];
      if (this.validateFile(file)) {
        this.selectedFile = file;
        this.generateFilePreview(file);
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private validateFile(file: File): boolean {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/webm'
    ];

    if (file.size > maxSize) {
      this.toastr.error('Arquivo muito grande. Tamanho máximo: 50MB');
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      this.toastr.error('Tipo de arquivo não suportado');
      return false;
    }

    return true;
  }

  private generateFilePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.filePreviewUrl = e.target?.result as string;
      this.fileType = file.type.startsWith('image/') ? 'image' : 'video';
    };
    reader.readAsDataURL(file);
  }

  private getFileType(url: string): 'image' | 'video' {
    const videoExtensions = ['.mp4', '.mov', '.webm', '.avi'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext)) ? 'video' : 'image';
  }

  removeFile(): void {
    this.selectedFile = null;
    this.filePreviewUrl = null;
    this.fileType = null;

    // Reset file input
    const fileInput = document.getElementById('imageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // =====================
  // 📌 Provider Management
  // =====================
  toggleProvider(provider: string): void {
    const index = this.selectedProviders.indexOf(provider);

    if (index > -1) {
      this.selectedProviders.splice(index, 1);
    } else {
      this.selectedProviders.push(provider);
    }

    this.postForm.patchValue({ providers: this.selectedProviders });
  }

  isProviderSelected(provider: string): boolean {
    return this.selectedProviders.includes(provider);
  }

  getProviderConfig(provider: string) {
    return this.availableProviders.find(p => p.value === provider);
  }

  // =====================
  // 📌 Schedule Management
  // =====================
  onScheduleTypeChange(type: 'now' | 'schedule'): void {
    this.scheduleType = type;

    if (type === 'now') {
      this.postForm.get('scheduledAt')?.setValue('');
      this.postForm.get('scheduledAt')?.clearValidators();
    } else {
      this.postForm.get('scheduledAt')?.setValidators([Validators.required]);
    }

    this.postForm.get('scheduledAt')?.updateValueAndValidity();
  }

  getMinDateTime(): string {
    const now = new Date();
    const minDate = new Date(now.getTime() + 5 * 60000); // 5 minutes from now
    return this.formatDateTimeLocal(minDate);
  }

  // =====================
  // 📌 Search and Filters
  // =====================
  onSearch(): void {
    this.applyFilters();
  }

  setStatusFilter(filter: 'all' | 'published' | 'scheduled' | 'draft'): void {
    this.statusFilter = filter;
    this.applyFilters();
  }

  setProviderFilter(filter: 'all' | 'facebook' | 'instagram' | 'linkedin' | 'twitter'): void {
    this.providerFilter = filter;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredPosts = this.postsList.filter(post => {
      const matchesSearch = !this.searchTerm ||
        post.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        post.message.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatus = this.statusFilter === 'all' || post.status.toString() === this.statusFilter;

      const matchesProvider = this.providerFilter === 'all' ||
        post.providers.includes(this.providerFilter);

      return matchesSearch && matchesStatus && matchesProvider;
    });
  }

  // =====================
  // 📌 Preview
  // =====================
  showPreview(): void {
    if (!this.postForm.get('title')?.value || !this.postForm.get('message')?.value || this.selectedProviders.length === 0) {
      this.toastr.error('Preencha os campos obrigatórios para visualizar');
      return;
    }

    this.showPreviewModal = true;
  }

  getPreviewData() {
    return {
      title: this.postForm.get('title')?.value,
      message: this.postForm.get('message')?.value,
      providers: this.selectedProviders,
      fileUrl: this.filePreviewUrl,
      fileType: this.fileType,
      scheduledAt: this.scheduleType === 'schedule' ? this.postForm.get('scheduledAt')?.value : null
    };
  }

  // =====================
  // 📌 Draft Management
  // =====================
  saveDraft(): void {
    const draftData = {
      title: this.postForm.get('title')?.value,
      message: this.postForm.get('message')?.value,
      providers: this.selectedProviders,
      scheduledAt: this.postForm.get('scheduledAt')?.value,
      scheduleType: this.scheduleType,
      timestamp: new Date().toISOString()
    };

    try {
      localStorage.setItem('socialMediaPostDraft', JSON.stringify(draftData));
      this.toastr.success('Rascunho salvo com sucesso!');
    } catch (error) {
      this.toastr.error('Erro ao salvar rascunho');
    }
  }

  loadDraftFromStorage(): void {
    try {
      const draft = localStorage.getItem('socialMediaPostDraft');
      if (draft) {
        const draftData = JSON.parse(draft);

        this.postForm.patchValue({
          title: draftData.title || '',
          message: draftData.message || '',
          scheduledAt: draftData.scheduledAt || ''
        });

        this.selectedProviders = draftData.providers || [];
        this.scheduleType = draftData.scheduleType || 'now';
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }

  clearDraftFromStorage(): void {
    localStorage.removeItem('socialMediaPostDraft');
  }

  // =====================
  // 📌 Pagination
  // =====================
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.loadPosts(page);
    }
  }

  // =====================
  // 📌 Form Validation
  // =====================
  private markFormGroupTouched(): void {
    Object.keys(this.postForm.controls).forEach(key => {
      const control = this.postForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.postForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.postForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} é obrigatório`;
      if (field.errors['maxlength']) return `${fieldName} excede o limite de caracteres`;
    }
    return '';
  }

  // =====================
  // 📌 Utility Methods
  // =====================
  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('pt-BR');
  }

  formatDateTime(date: Date | string): string {
    return new Date(date).toLocaleString('pt-BR');
  }

  private formatDateTimeLocal(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().slice(0, 16);
  }

  getStatusBadgeClass(status: PostStatus): string {
    const classes = {
      2: 'badge-success',
      1: 'badge-warning',
      0: 'badge-secondary',
      3: 'badge-danger'
    };
    return classes[status as keyof typeof classes] || 'badge-secondary';
  }

  getStatusText(status: PostStatus): string {
    const texts = {
      2: 'Publicado',
      1: 'Agendado',
      0: 'Rascunho',
      3: 'Falhou'
    };
    return texts[status as keyof typeof texts] || status.toString();
  }

  getCharacterCount(fieldName: string): number {
    return this.postForm.get(fieldName)?.value?.length || 0;
  }

  getCharacterCountClass(current: number, max: number): string {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'text-danger';
    if (percentage >= 75) return 'text-warning';
    return 'text-muted';
  }

  // =====================
  // 📌 Analytics Methods
  // =====================
  getTotalEngagement(post: Post): number {
    return (post.engagement?.likes || 0) +
      (post.engagement?.shares || 0) +
      (post.engagement?.comments || 0);
  }

  getEngagementRate(post: Post): number {
    const total = this.getTotalEngagement(post);
    const views = post.engagement?.views || 1;
    return Math.round((total / views) * 100);
  }
}
