import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private authService: AuthService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('jwt');
    const isInternalRequest = this.isInternalUrl(req.url);

    if (token && isInternalRequest) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // NÃO trate erros 401 que sejam da rota de login
        // Isso permite que o componente trate o erro do login
        if (error.status === 401 && (!isInternalRequest || new URL(req.url, document.baseURI).pathname.endsWith('/auth/login'))) {
          // Simplesmente retorna o erro sem fazer nada
          return throwError(() => error);
        }

        // Para outros erros 401 (sessão expirada em outras requisições)
        if (error.status === 401) {
          // Remove o token expirado
          this.authService.logout();

          // Redireciona para login
          this.router.navigate(['/login']);

          console.warn('Sessão expirada. Faça login novamente.');
        }

        return throwError(() => error);
      })
    );
  }

  private isInternalUrl(value: string): boolean {
    try {
      const requested = new URL(value, document.baseURI);
      const api = new URL(environment.apiUrl, document.baseURI);
      const server = new URL(environment.serverUrl, document.baseURI);
      const withinPath = (path: string, root: string) => path === root || path.startsWith(`${root}/`);
      return !requested.username && !requested.password &&
        ((requested.origin === api.origin && withinPath(requested.pathname, api.pathname.replace(/\/+$/, ''))) ||
         (requested.origin === server.origin && withinPath(requested.pathname, '/Uploads')) ||
         (requested.origin === location.origin && withinPath(requested.pathname, '/api')));
    } catch { return false; }
  }
}
