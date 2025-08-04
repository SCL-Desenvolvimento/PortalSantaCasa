import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Menu } from '../models/menu.model';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private apiUrl = '/api/menu';

  constructor(private http: HttpClient) { }

  // Menu management
  getMenu(): Observable<Menu[]> {
    return this.http.get<{ menu: Menu[] }>(`${this.apiUrl}/admin/menu`).pipe(
      map(response => response.menu),
      catchError(this.handleError)
    );
  }

  getMenuById(id: number): Observable<Menu> {
    return this.http.get<{ birthday: Menu }>(`${this.apiUrl}/admin/menu/${id}`).pipe(
      map(response => response.birthday),
      catchError(this.handleError)
    );
  }

  createMenu(birthday: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/menu`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  updateMenu(id: number, birthday: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/menu/${id}`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  deleteMenu(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/menu/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocorreu um erro. Tente novamente mais tarde.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erro: ${error.error.message}`;
    } else {
      errorMessage = error.error?.error || errorMessage;
    }
    return throwError(() => new Error(errorMessage));
  }
}
