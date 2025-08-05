import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Document } from '../models/document.model';
import { environment } from '../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private apiUrl = `${environment.apiUrl}/document`

  constructor(private http: HttpClient) { }

  getDocuments(): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  getDocumentById(id: number): Observable<Document> {
    return this.http.get<Document>(`${this.apiUrl}/${id}`).pipe(
      map(response => response),
      catchError(this.handleError)
    );
  }

  createDocument(document: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}`, document).pipe(
      catchError(this.handleError)
    );
  }

  updateDocument(id: number, document: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, document).pipe(
      catchError(this.handleError)
    );
  }

  deleteDocument(id: number): Observable<any> {
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
