import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Event } from '../models/event.model';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private apiUrl = '/api/event';

  constructor(private http: HttpClient) { }

  // Event management
  getEvent(): Observable<Event[]> {
    return this.http.get<{ event: Event[] }>(`${this.apiUrl}/admin/event`).pipe(
      map(response => response.event),
      catchError(this.handleError)
    );
  }

  getEventById(id: number): Observable<Event> {
    return this.http.get<{ birthday: Event }>(`${this.apiUrl}/admin/event/${id}`).pipe(
      map(response => response.birthday),
      catchError(this.handleError)
    );
  }

  createEvent(birthday: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/event`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  updateEvent(id: number, birthday: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/event/${id}`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  deleteEvent(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/event/${id}`).pipe(
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
