import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, map, Observable, Subject, throwError } from 'rxjs';
import { User } from '../../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/user`;
  private readonly profileUpdatedSubject = new Subject<User>();
  readonly profileUpdated$ = this.profileUpdatedSubject.asObservable();

  constructor(private http: HttpClient) { }

  getUsersPaginated(page: number = 1, perPage: number = 10): Observable<{ currentPage: number, perPage: number, pages: number, users: User[] }> {
    return this.http.get<{ currentPage: number, perPage: number, pages: number, users: User[] }>(
      `${this.apiUrl}/paginated?page=${page}&perPage=${perPage}`
    ).pipe(catchError(this.handleError));
  }

  getUser(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/all`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query.trim())}`).pipe(
      catchError(this.handleError)
    );
  }

  getCurrentProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(catchError(this.handleError));
  }

  updateCurrentProfile(profile: FormData): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/me`, profile).pipe(
      map(user => {
        this.profileUpdatedSubject.next(user);
        return user;
      }),
      catchError(this.handleError)
    );
  }

  changeOwnPassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/me/change-password`, {
      currentPassword,
      newPassword
    }).pipe(catchError(this.handleError));
  }

  createUser(user: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}`, user).pipe(
      catchError(this.handleError)
    );
  }

  updateUser(id: number, user: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, user).pipe(
      catchError(this.handleError)
    );
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  resetPassword(userId: number) {
    return this.http.post(`${this.apiUrl}/reset-password/${userId}`, {}).pipe(
      catchError(this.handleError)
    );
  }

  changePassword(userId: number, newPassword: string, token?: string) {
    const options = token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : {};

    return this.http.post<any>(`${this.apiUrl}/${userId}/change-password`, { newPassword }, options).pipe(
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
