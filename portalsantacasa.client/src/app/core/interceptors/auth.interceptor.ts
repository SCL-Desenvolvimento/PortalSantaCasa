import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private authService: AuthService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('jwt');

    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // NÃO trate erros 401 que sejam da rota de login
        // Isso permite que o componente trate o erro do login
        if (error.status === 401 && req.url.includes('/auth/login')) {
          // Simplesmente retorna o erro sem fazer nada
          return throwError(() => error);
        }

        // Para outros erros 401 (sessão expirada em outras requisições)
        if (error.status === 401) {
          // Remove o token expirado
          //this.authService.logout();

          // Redireciona para login
          //this.router.navigate(['/login']);

          console.warn('Sessão expirada. Faça login novamente.');
        }

        return throwError(() => error);
      })
    );
  }
}
