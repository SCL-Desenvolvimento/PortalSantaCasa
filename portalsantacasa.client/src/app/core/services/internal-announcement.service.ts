import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { InternalAnnouncement, PaginatedInternalAnnouncement } from '../../models/internal-announcement.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InternalAnnouncementService {

  private apiUrl = `${environment.apiUrl}/internalannouncement`;

  constructor(private http: HttpClient) { }

  getPaginated(page: number, perPage: number): Observable<PaginatedInternalAnnouncement> {
    return this.http.get<PaginatedInternalAnnouncement>(`${this.apiUrl}/paginated?page=${page}&perPage=${perPage}`)
      .pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<InternalAnnouncement> {
    return this.http.get<InternalAnnouncement>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  create(formData: FormData): Observable<InternalAnnouncement> {
    return this.http.post<InternalAnnouncement>(this.apiUrl, formData)
      .pipe(catchError(this.handleError));
  }

  update(id: number, formData: FormData): Observable<InternalAnnouncement> {
    return this.http.put<InternalAnnouncement>(`${this.apiUrl}/${id}`, formData)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
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
