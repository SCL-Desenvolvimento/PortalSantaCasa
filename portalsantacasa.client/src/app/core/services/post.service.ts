import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Post } from '../../models/post.model';

export interface PostCreateDto {
  title: string;
  message: string;
  providers: string[];
  scheduledAt?: string;
  isActive?: boolean;
}

export interface PaginatedResponse<T> {
  posts: T[];
  currentPage: number;
  perPage: number;
  pages: number;
  total: number;
}

export interface PostResponse {
  success: boolean;
  data: Post;
  message?: string;
}

export interface PostListResponse {
  success: boolean;
  data: Post[];
  pagination?: {
    currentPage: number;
    perPage: number;
    total: number;
    pages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private apiUrl = 'http://localhost:5000/api/posts'; // Ajustar conforme necessário

  constructor(private http: HttpClient) { }

  // =====================
  // 📌 CRUD Operations
  // =====================

  /**
   * Criar um novo post
   * Aceita FormData para suporte a upload de arquivos
   */
  createPost(formData: FormData): Observable<PostResponse> {
    return this.http.post<PostResponse>(`${this.apiUrl}`, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obter todos os posts com paginação
   */
  getPostsPaginated(page: number = 1, perPage: number = 10): Observable<PaginatedResponse<Post>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('perPage', perPage.toString());

    return this.http.get<PostListResponse>(`${this.apiUrl}`, { params })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return {
              posts: response.data,
              currentPage: response.pagination?.currentPage || page,
              perPage: response.pagination?.perPage || perPage,
              pages: response.pagination?.pages || 1,
              total: response.pagination?.total || response.data.length
            };
          }
          throw new Error('Resposta inválida do servidor');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obter todos os posts (sem paginação)
   */
  getAllPosts(): Observable<Post[]> {
    return this.http.get<PostListResponse>(`${this.apiUrl}/all`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error('Resposta inválida do servidor');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obter um post específico por ID
   */
  getPostById(id: number): Observable<Post> {
    return this.http.get<PostResponse>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error('Post não encontrado');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Atualizar um post existente
   * Aceita FormData para suporte a upload de arquivos
   */
  updatePost(id: number, formData: FormData): Observable<PostResponse> {
    return this.http.put<PostResponse>(`${this.apiUrl}/${id}`, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Excluir um post
   */
  deletePost(id: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  // =====================
  // 📌 Publishing Operations
  // =====================

  /**
   * Publicar um post (método legado - mantido para compatibilidade)
   */
  publishPost(postData: PostCreateDto): Observable<PostResponse> {
    return this.http.post<PostResponse>(`${this.apiUrl}/publish`, postData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Publicar um post com arquivo
   * Aceita FormData para suporte a upload de arquivos
   */
  publishPostWithFile(formData: FormData): Observable<PostResponse> {
    return this.http.post<PostResponse>(`${this.apiUrl}/publish`, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Republicar um post existente
   */
  republishPost(id: number, formData?: FormData): Observable<PostResponse> {
    const data = formData || new FormData();
    return this.http.post<PostResponse>(`${this.apiUrl}/${id}/republish`, data)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Agendar um post para publicação futura
   */
  schedulePost(formData: FormData): Observable<PostResponse> {
    return this.http.post<PostResponse>(`${this.apiUrl}/schedule`, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  // =====================
  // 📌 Status Operations
  // =====================

  /**
   * Alterar status de um post (ativo/inativo)
   */
  togglePostStatus(id: number, isActive: boolean): Observable<PostResponse> {
    const formData = new FormData();
    formData.append('isActive', String(isActive));

    return this.http.patch<PostResponse>(`${this.apiUrl}/${id}/status`, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Cancelar agendamento de um post
   */
  cancelSchedule(id: number): Observable<PostResponse> {
    return this.http.patch<PostResponse>(`${this.apiUrl}/${id}/cancel-schedule`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  // =====================
  // 📌 Analytics Operations
  // =====================

  /**
   * Obter estatísticas dos posts
   */
  getPostStatistics(): Observable<{
    total: number;
    published: number;
    scheduled: number;
    draft: number;
    active: number;
    inactive: number;
  }> {
    return this.http.get<{
      success: boolean;
      data: {
        total: number;
        published: number;
        scheduled: number;
        draft: number;
        active: number;
        inactive: number;
      };
    }>(`${this.apiUrl}/statistics`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error('Erro ao obter estatísticas');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obter métricas de engajamento de um post
   */
  getPostEngagement(id: number): Observable<{
    likes: number;
    shares: number;
    comments: number;
    views: number;
    engagementRate: number;
  }> {
    return this.http.get<{
      success: boolean;
      data: {
        likes: number;
        shares: number;
        comments: number;
        views: number;
        engagementRate: number;
      };
    }>(`${this.apiUrl}/${id}/engagement`)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error('Erro ao obter métricas de engajamento');
        }),
        catchError(this.handleError)
      );
  }

  // =====================
  // 📌 Search and Filter Operations
  // =====================

  /**
   * Buscar posts por termo
   */
  searchPosts(term: string, page: number = 1, perPage: number = 10): Observable<PaginatedResponse<Post>> {
    const params = new HttpParams()
      .set('q', term)
      .set('page', page.toString())
      .set('perPage', perPage.toString());

    return this.http.get<PostListResponse>(`${this.apiUrl}/search`, { params })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return {
              posts: response.data,
              currentPage: response.pagination?.currentPage || page,
              perPage: response.pagination?.perPage || perPage,
              pages: response.pagination?.pages || 1,
              total: response.pagination?.total || response.data.length
            };
          }
          throw new Error('Erro na busca');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Filtrar posts por status
   */
  getPostsByStatus(status: string, page: number = 1, perPage: number = 10): Observable<PaginatedResponse<Post>> {
    const params = new HttpParams()
      .set('status', status)
      .set('page', page.toString())
      .set('perPage', perPage.toString());

    return this.http.get<PostListResponse>(`${this.apiUrl}/filter`, { params })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return {
              posts: response.data,
              currentPage: response.pagination?.currentPage || page,
              perPage: response.pagination?.perPage || perPage,
              pages: response.pagination?.pages || 1,
              total: response.pagination?.total || response.data.length
            };
          }
          throw new Error('Erro no filtro');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Filtrar posts por provedor
   */
  getPostsByProvider(provider: string, page: number = 1, perPage: number = 10): Observable<PaginatedResponse<Post>> {
    const params = new HttpParams()
      .set('provider', provider)
      .set('page', page.toString())
      .set('perPage', perPage.toString());

    return this.http.get<PostListResponse>(`${this.apiUrl}/provider`, { params })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return {
              posts: response.data,
              currentPage: response.pagination?.currentPage || page,
              perPage: response.pagination?.perPage || perPage,
              pages: response.pagination?.pages || 1,
              total: response.pagination?.total || response.data.length
            };
          }
          throw new Error('Erro no filtro por provedor');
        }),
        catchError(this.handleError)
      );
  }

  // =====================
  // 📌 Draft Operations
  // =====================

  /**
   * Salvar rascunho
   */
  saveDraft(formData: FormData): Observable<PostResponse> {
    formData.append('status', 'draft');
    return this.http.post<PostResponse>(`${this.apiUrl}/draft`, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Obter rascunhos do usuário
   */
  getDrafts(page: number = 1, perPage: number = 10): Observable<PaginatedResponse<Post>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('perPage', perPage.toString());

    return this.http.get<PostListResponse>(`${this.apiUrl}/drafts`, { params })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return {
              posts: response.data,
              currentPage: response.pagination?.currentPage || page,
              perPage: response.pagination?.perPage || perPage,
              pages: response.pagination?.pages || 1,
              total: response.pagination?.total || response.data.length
            };
          }
          throw new Error('Erro ao obter rascunhos');
        }),
        catchError(this.handleError)
      );
  }

  // =====================
  // 📌 Utility Methods
  // =====================

  /**
   * Validar dados do post antes do envio
   */
  validatePostData(formData: FormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const title = formData.get('title') as string;
    const message = formData.get('message') as string;
    const providers = formData.get('providers') as string;

    if (!title || title.trim().length === 0) {
      errors.push('Título é obrigatório');
    }

    if (!message || message.trim().length === 0) {
      errors.push('Mensagem é obrigatória');
    }

    if (!providers) {
      errors.push('Pelo menos um provedor deve ser selecionado');
    } else {
      try {
        const parsedProviders = JSON.parse(providers);
        if (!Array.isArray(parsedProviders) || parsedProviders.length === 0) {
          errors.push('Pelo menos um provedor deve ser selecionado');
        }
      } catch {
        errors.push('Formato de provedores inválido');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Converter Post para FormData
   */
  postToFormData(post: Post): FormData {
    const formData = new FormData();

    formData.append('title', post.title);
    formData.append('message', post.message);
    formData.append('providers', JSON.stringify(post.providers));
    formData.append('status', post.status.toString());
    formData.append('isActive', String(post.isActive));

    if (post.scheduledAt) {
      formData.append('scheduledAt', post.scheduledAt);
    }

    if (post.publishedAt) {
      formData.append('publishedAt', post.publishedAt);
    }

    if (post.createdByUserId) {
      formData.append('userId', post.createdByUserId.toString());
    }

    return formData;
  }

  // =====================
  // 📌 Error Handling
  // =====================

  /**
   * Manipulador de erros centralizado
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Erro desconhecido';

    if (error.error instanceof ErrorEvent) {
      // Erro do lado do cliente
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      // Erro do lado do servidor
      if (error.status === 0) {
        errorMessage = 'Não foi possível conectar ao servidor';
      } else if (error.status === 401) {
        errorMessage = 'Não autorizado. Faça login novamente';
      } else if (error.status === 403) {
        errorMessage = 'Acesso negado';
      } else if (error.status === 404) {
        errorMessage = 'Recurso não encontrado';
      } else if (error.status === 422) {
        errorMessage = error.error?.message || 'Dados inválidos';
      } else if (error.status === 500) {
        errorMessage = 'Erro interno do servidor';
      } else {
        errorMessage = error.error?.message || `Erro ${error.status}: ${error.statusText}`;
      }
    }

    console.error('PostService Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}
