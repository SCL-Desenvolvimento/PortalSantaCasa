import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Stats } from '../../models/stats.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private apiUrl = `${environment.apiUrl}/stats`

  constructor(private http: HttpClient) {}

  getStats(): Observable<Stats> {
    return this.http.get<Stats>(`${this.apiUrl}`).pipe(
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
