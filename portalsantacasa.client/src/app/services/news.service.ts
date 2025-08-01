import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  private apiUrl = '/api/news';

  constructor(private http: HttpClient) { }

  getNewsById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  getAllNews(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }
}
