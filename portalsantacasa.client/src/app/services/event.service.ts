import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Event } from '../models/event.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EventService {
  private apiUrl = `${environment.apiUrl}/event`

  constructor(private http: HttpClient) { }

  getEvent(): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.apiUrl}`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  getEventById(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/${id}`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  createEvent(event: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}`, event).pipe(
      catchError(this.handleError)
    );
  }

  updateEvent(id: number, event: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, event).pipe(
      catchError(this.handleError)
    );
  }

  deleteEvent(id: number): Observable<any> {
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
