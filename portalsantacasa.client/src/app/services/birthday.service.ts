import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Birthday } from '../models/birthday.model';

@Injectable({
  providedIn: 'root',
})
export class BirthdayService {
  private apiUrl = '/api/birthdays';

  constructor(private http: HttpClient) { }

  // Birthday management
  getBirthdays(): Observable<Birthday[]> {
    return this.http.get<{ birthdays: Birthday[] }>(`${this.apiUrl}/admin/birthdays`).pipe(
      map(response => response.birthdays),
      catchError(this.handleError)
    );
  }

  getBirthdayById(id: number): Observable<Birthday> {
    return this.http.get<{ birthday: Birthday }>(`${this.apiUrl}/admin/birthdays/${id}`).pipe(
      map(response => response.birthday),
      catchError(this.handleError)
    );
  }

  createBirthday(birthday: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/birthdays`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  updateBirthday(id: number, birthday: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/birthdays/${id}`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  deleteBirthday(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/birthdays/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload/image`, formData).pipe(
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
