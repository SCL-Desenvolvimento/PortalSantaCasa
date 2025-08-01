import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { News } from '../models/news.model';
import { Document } from '../models/document.model';
import { Stats } from '../models/stats.model';
import { Birthday } from '../models/birthday.model';
import { Menu } from '../models/menu.model';
import { Event } from '../models/event.model';
import { Feedback } from '../models/feedback.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = '/api'; // Adjust to your .NET API base URL

  constructor(private http: HttpClient) {}

  // Check authentication
  checkAuth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/me`).pipe(
      catchError(this.handleError)
    );
  }

  // Logout
  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/logout`, {}).pipe(
      catchError(this.handleError)
    );
  }

  // Load dashboard stats
  getStats(): Observable<Stats> {
    return this.http.get<Stats>(`${this.apiUrl}/admin/stats`).pipe(
      catchError(this.handleError)
    );
  }

  // News management
  getNews(): Observable<News[]> {
    return this.http.get<{ news: News[] }>(`${this.apiUrl}/admin/news`).pipe(
      map(response => response.news),
      catchError(this.handleError)
    );
  }

  getNewsById(id: number): Observable<News> {
    return this.http.get<News>(`${this.apiUrl}/admin/news/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  createNews(news: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/news`, news).pipe(
      catchError(this.handleError)
    );
  }

  updateNews(id: number, news: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/news/${id}`, news).pipe(
      catchError(this.handleError)
    );
  }

  deleteNews(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/news/${id}`).pipe(
      catchError(this.handleError)
    );
  }

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

  // Birthday management
  getBirthdays(): Observable<Birthday[]> {
    return this.http.get<{ birthdays: Birthday[] }>(`${this.apiUrl}/admin/birthdays`).pipe(
      map(response => response.birthdays),
      catchError(this.handleError)
    );
  }

  getBirthdayById(id: number): Observable<Birthday> {
    return this.http.get<{ birthday: Birthday }>(`${this.apiUrl}/admin/birthdays/${id}`).pipe(
      map(response => response.birthday),
      catchError(this.handleError)
    );
  }

  createBirthday(birthday: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/birthdays`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  updateBirthday(id: number, birthday: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/birthdays/${id}`, birthday).pipe(
      catchError(this.handleError)
    );
  }

  deleteBirthday(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/birthdays/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // Menu management
  getMenu(): Observable<Menu[]> {
    return this.http.get<{ menu: Menu[] }>(`${this.apiUrl}/admin/menu`).pipe(
      map(response => response.menu),
      catchError(this.handleError)
    );
  }

  // Event management
  getEvents(): Observable<Event[]> {
    return this.http.get<{ events: Event[] }>(`${this.apiUrl}/admin/events`).pipe(
      map(response => response.events),
      catchError(this.handleError)
    );
  }

  // Feedback management
  getFeedbacks(): Observable<Feedback[]> {
    return this.http.get<{ feedbacks: Feedback[] }>(`${this.apiUrl}/admin/feedbacks`).pipe(
      map(response => response.feedbacks),
      catchError(this.handleError)
    );
  }

  updateFeedbackStatus(id: number, status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/feedbacks/${id}`, { status }).pipe(
      catchError(this.handleError)
    );
  }

  deleteFeedback(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/admin/feedbacks/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // User management
  getUsers(): Observable<User[]> {
    return this.http.get<{ users: User[] }>(`${this.apiUrl}/admin/users`).pipe(
      map(response => response.users),
      catchError(this.handleError)
    );
  }

  // Upload file
  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload/image`, formData).pipe(
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
