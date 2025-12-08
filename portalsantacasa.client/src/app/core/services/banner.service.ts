import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Banner } from '../../models/banner.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class BannerService {
  private apiUrl = `${environment.apiUrl}/banners`

  constructor(private http: HttpClient) { }

  getBanners(): Observable<Banner[]> {
    return this.http.get<Banner[]>(`${this.apiUrl}`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  getBannerById(id: number): Observable<Banner> {
    return this.http.get<Banner>(`${this.apiUrl}/${id}`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  createBanner(banner: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}`, banner).pipe(
      catchError(this.handleError)
    );
  }

  updateBanner(id: number, banner: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, banner).pipe(
      catchError(this.handleError)
    );
  }

  deleteBanner(id: number): Observable<any> {
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
