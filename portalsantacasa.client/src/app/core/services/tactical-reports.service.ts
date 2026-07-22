import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TacticalReportDefinition, TacticalReportResult } from '../../models/tactical-report.model';

@Injectable({ providedIn: 'root' })
export class TacticalReportsService {
  private readonly url = `${environment.apiUrl}/tactical-reports`;

  constructor(private http: HttpClient) {}

  getCatalog(): Observable<TacticalReportDefinition[]> {
    return this.http.get<TacticalReportDefinition[]>(`${this.url}/catalog`);
  }

  getReport(slug: string, agentId?: string): Observable<TacticalReportResult> {
    let params = new HttpParams();
    if (agentId?.trim()) params = params.set('agentId', agentId.trim());
    return this.http.get<TacticalReportResult>(`${this.url}/${encodeURIComponent(slug)}`, { params });
  }
}
