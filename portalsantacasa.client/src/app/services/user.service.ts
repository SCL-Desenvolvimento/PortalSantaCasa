import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = '/api/user';

  constructor(private http: HttpClient) { }

  getUser(): Observable<User[]> {
    return this.http.get<{ user: User[] }>(`${this.apiUrl}/admin/user`).pipe(
      map(response => response.user),
      catchError(this.handleError)
    );
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<{ birthday: User }>(`${this.apiUrl}/admin/user/${id}`).pipe(
      map(response => response.birthday),
      catchError(this.handleError)
    );
  }

  createUser(birthday: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/user`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  updateUser(id: number, birthday: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/user/${id}`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/user/${id}`).pipe(
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
