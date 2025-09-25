import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Birthday } from '../../models/birthday.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BirthdayService {
  private apiUrl = `${environment.apiUrl}/birthday`

  constructor(private http: HttpClient) { }

  getBirthdays(): Observable<Birthday[]> {
    return this.http.get<Birthday[]>(`${this.apiUrl}/all`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  getBirthdaysPaginated(page: number = 1, perPage: number = 10): Observable<{ currentPage: number, perPage: number, pages: number, birthdays: Birthday[] }> {
    return this.http.get<{ currentPage: number, perPage: number, pages: number, birthdays: Birthday[] }>(
      `${this.apiUrl}/paginated?page=${page}&perPage=${perPage}`
    ).pipe(catchError(this.handleError));
  }

  getBirthdayById(id: number): Observable<Birthday> {
    return this.http.get<Birthday>(`${this.apiUrl}/${id}`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  createBirthday(birthday: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  updateBirthday(id: number, birthday: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  deleteBirthday(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  getNextBirthdays(): Observable<Birthday[]> {
    return this.http.get<Birthday[]>(`${this.apiUrl}/next-birthdays`).pipe(
      map(response => response),
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
