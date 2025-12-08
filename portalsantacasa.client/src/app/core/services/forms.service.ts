import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FormsCreateDto, FormsResponseDto, FormsUpdateDto } from '../../models/forms.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FormsService {
  private apiUrl = `${environment.apiUrl}/forms`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<FormsResponseDto[]> {
    return this.http.get<FormsResponseDto[]>(this.apiUrl);
  }

  getById(id: number): Observable<FormsResponseDto> {
    return this.http.get<FormsResponseDto>(`${this.apiUrl}/${id}`);
  }

  create(dto: FormsCreateDto): Observable<FormsResponseDto> {
    return this.http.post<FormsResponseDto>(this.apiUrl, dto);
  }

  update(id: number, dto: FormsUpdateDto): Observable<FormsResponseDto> {
    return this.http.put<FormsResponseDto>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
