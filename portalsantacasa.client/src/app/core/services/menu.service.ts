import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Menu } from '../../models/menu.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  private apiUrl = `${environment.apiUrl}/menu`

  constructor(private http: HttpClient) { }

  getMenu(): Observable<Menu[]> {
    return this.http.get<Menu[]>(`${this.apiUrl}`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  getMenuById(id: number): Observable<Menu> {
    return this.http.get<Menu>(`${this.apiUrl}/${id}`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  createMenu(birthday: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  updateMenu(id: number, menu: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, menu).pipe(
      catchError(this.handleError)
    );
  }

  deleteMenu(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
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
