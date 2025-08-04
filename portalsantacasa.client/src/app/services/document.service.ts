import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { Document } from '../models/document.model';

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private apiUrl = '/api/documents';

  constructor(private http: HttpClient) { }

  // Document management
  getDocuments(): Observable<Document[]> {
    return this.http.get<{ documents: Document[] }>(`${this.apiUrl}/admin/documents`).pipe(
      map(response => response.documents),
      catchError(this.handleError)
    );
  }

  getDocumentById(id: number): Observable<Document> {
    return this.http.get<{ document: Document }>(`${this.apiUrl}/admin/documents/${id}`).pipe(
      map(response => response.document),
      catchError(this.handleError)
    );
  }

  createDocument(document: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/documents`, document).pipe(
      catchError(this.handleError)
    );
  }

  updateDocument(id: number, document: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/documents/${id}`, document).pipe(
      catchError(this.handleError)
    );
  }

  deleteDocument(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/documents/${id}`).pipe(
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
