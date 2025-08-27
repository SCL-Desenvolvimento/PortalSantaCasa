import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { News } from '../models/news.model';
import { environment } from '../../environments/environment'

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private apiUrl = `${environment.apiUrl}/news`

  constructor(private http: HttpClient) { }

  getNews() {
    return this.http.get<News[]>(`${this.apiUrl}/all`).pipe(
      catchError(this.handleError)
    );
  }

  getNewsPaginated(page: number = 1, perPage: number = 10): Observable<{ currentPage: number, perPage: number, pages: number, news: News[] }> {
    return this.http.get<{ currentPage: number, perPage: number, pages: number, news: News[] }>(
      `${this.apiUrl}/paginated?page=${page}&perPage=${perPage}`
    ).pipe(catchError(this.handleError));
  }

  getNewsById(id: number): Observable<News> {
    return this.http.get<News>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  createNews(news: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}`, news).pipe(
      catchError(this.handleError)
    );
  }

  updateNews(id: number, news: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, news).pipe(
      catchError(this.handleError)
    );
  }

  deleteNews(id: number): Observable<any> {
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
