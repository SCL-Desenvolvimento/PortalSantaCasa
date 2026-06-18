import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedPublicAccessLog, PublicAccessLog, PublicAccessLogCreate } from '../../models/public-access-log.model';

@Injectable({
  providedIn: 'root'
})
export class PublicAccessLogService {
  private apiUrl = `${environment.apiUrl}/publicaccesslog`;

  constructor(private http: HttpClient) { }

  create(payload: PublicAccessLogCreate): Observable<PublicAccessLog> {
    return this.http.post<PublicAccessLog>(this.apiUrl, payload).pipe(
      catchError(this.handleError)
    );
  }

  getReport(params: {
    pageType?: string;
    startDate?: string;
    endDate?: string;
    sector?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PaginatedPublicAccessLog> {
    let httpParams = new HttpParams();

    if (params.pageType) {
      httpParams = httpParams.set('pageType', params.pageType);
    }

    if (params.startDate) {
      httpParams = httpParams.set('startDate', params.startDate);
    }

    if (params.endDate) {
      httpParams = httpParams.set('endDate', params.endDate);
    }

    if (params.sector) {
      httpParams = httpParams.set('sector', params.sector);
    }

    if (params.page) {
      httpParams = httpParams.set('page', params.page);
    }

    if (params.pageSize) {
      httpParams = httpParams.set('pageSize', params.pageSize);
    }

    return this.http.get<PaginatedPublicAccessLog>(this.apiUrl, { params: httpParams }).pipe(
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
