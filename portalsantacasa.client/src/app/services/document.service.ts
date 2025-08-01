import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Document {
  id: number;
  name: string;
  parent_id?: number;
  file_url?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  constructor(private http: HttpClient) { }

  // Simula uma API (substitua pelo URL real da API)
  getDocuments(): Observable<{ documents: Document[] }> {
    return this.http.get<{ documents: Document[] }>('/api/documents');
  }
}
