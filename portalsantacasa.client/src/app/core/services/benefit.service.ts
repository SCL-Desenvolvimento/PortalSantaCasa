import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Benefit, BenefitInput } from '../../models/benefit.model';

@Injectable({ providedIn: 'root' })
export class BenefitService {
  private readonly apiUrl = `${environment.apiUrl}/benefits`;
  constructor(private http: HttpClient) {}
  getPublic() { return this.http.get<Benefit[]>(this.apiUrl); }
  getAdmin() { return this.http.get<Benefit[]>(`${this.apiUrl}/admin`); }
  create(input: BenefitInput) { return this.http.post<Benefit>(this.apiUrl, input); }
  update(id: number, input: BenefitInput) { return this.http.put<Benefit>(`${this.apiUrl}/${id}`, input); }
  delete(id: number) { return this.http.delete<void>(`${this.apiUrl}/${id}`); }
}
