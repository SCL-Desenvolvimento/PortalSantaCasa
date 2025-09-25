import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Feedback } from '../../models/feedback.model';
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private apiUrl = `${environment.apiUrl}/feedback`
  private modalState = new BehaviorSubject<boolean>(false);
  modalState$ = this.modalState.asObservable();

  constructor(private http: HttpClient) { }

  getFeedback(): Observable<Feedback[]> {
    return this.http.get<Feedback[]>(`${this.apiUrl}/all`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  getFeedbackPaginated(page: number = 1, perPage: number = 10): Observable<{ currentPage: number, perPage: number, pages: number, feedbacks: Feedback[] }> {
    return this.http.get<{ currentPage: number, perPage: number, pages: number, feedbacks: Feedback[] }>(
      `${this.apiUrl}/paginated?page=${page}&perPage=${perPage}`
    ).pipe(catchError(this.handleError));
  }

  getFeedbackById(id: number): Observable<Feedback> {
    return this.http.get<Feedback>(`${this.apiUrl}/${id}`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  createFeedback(feedback: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}`, feedback).pipe(
      catchError(this.handleError)
    );
  }

  updateFeedback(id: number, feedback: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, feedback).pipe(
      catchError(this.handleError)
    );
  }

  deleteFeedback(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  updateFeedbackStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, { status }).pipe(
      catchError(this.handleError)
    );
  }

  markAsRead(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/mark-as-read`, {}).pipe(
      catchError(this.handleError));
  }

  open() {
    this.modalState.next(true);
  }

  close() {
    this.modalState.next(false);
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
