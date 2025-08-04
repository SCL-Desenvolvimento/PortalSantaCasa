import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Feedback } from '../models/feedback.model';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private apiUrl = '/api/feedbacks';

  constructor(private http: HttpClient) { }

  getFeedback(): Observable<Feedback[]> {
    return this.http.get<{ feedbacks: Feedback[] }>(`${this.apiUrl}/admin/feedbacks`).pipe(
      map(response => response.feedbacks),
      catchError(this.handleError)
    );
  }

  getFeedbackById(id: number): Observable<Feedback> {
    return this.http.get<{ birthday: Feedback }>(`${this.apiUrl}/admin/feedbacks/${id}`).pipe(
      map(response => response.birthday),
      catchError(this.handleError)
    );
  }

  createFeedback(birthday: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/feedbacks`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  updateFeedback(id: number, birthday: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/feedbacks/${id}`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  deleteFeedback(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/feedbacks/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  updateFeedbackStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/feedbacks/${id}`, { status }).pipe(
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
