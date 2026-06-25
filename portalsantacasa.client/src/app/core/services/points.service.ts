import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { EMPTY, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  PointEventResponse,
  PointIdentity,
  PointRule,
  PointsRankingItem,
  RegisterPointsRequest,
  UpdatePointRuleRequest
} from '../../models/points.model';

type RegisterPointsInput = Omit<RegisterPointsRequest, keyof PointIdentity>;

@Injectable({
  providedIn: 'root'
})
export class PointsService {
  private readonly apiUrl = `${environment.apiUrl}/points`;
  private readonly identityStorageKey = 'publicAccessIdentity';

  constructor(private http: HttpClient) { }

  saveIdentity(identity: PointIdentity): void {
    const normalizedIdentity: PointIdentity = {
      name: identity.name.trim(),
      re: identity.re.trim(),
      sector: identity.sector.trim()
    };

    if (!this.hasCompleteIdentity(normalizedIdentity)) {
      return;
    }

    sessionStorage.setItem(this.identityStorageKey, JSON.stringify(normalizedIdentity));
  }

  getSavedIdentity(): PointIdentity | null {
    const storedIdentity = sessionStorage.getItem(this.identityStorageKey);

    if (!storedIdentity) {
      return null;
    }

    try {
      const identity = JSON.parse(storedIdentity) as PointIdentity;
      return this.hasCompleteIdentity(identity) ? identity : null;
    } catch {
      sessionStorage.removeItem(this.identityStorageKey);
      return null;
    }
  }

  registerFromSavedIdentity(input: RegisterPointsInput): Observable<PointEventResponse> {
    const identity = this.getSavedIdentity();

    if (!identity) {
      return EMPTY;
    }

    return this.register({
      ...identity,
      ...input
    });
  }

  register(payload: RegisterPointsRequest): Observable<PointEventResponse> {
    return this.http.post<PointEventResponse>(`${this.apiUrl}/register`, payload).pipe(
      catchError((error: HttpErrorResponse) => {
        console.warn('Nao foi possivel registrar pontuacao.', error.error || error.message);
        return EMPTY;
      })
    );
  }

  getRanking(limit = 500): Observable<PointsRankingItem[]> {
    const params = new HttpParams().set('limit', limit);

    return this.http.get<PointsRankingItem[]>(`${this.apiUrl}/ranking`, { params });
  }

  getEvents(params: {
    re?: string;
    eventType?: string;
    referenceId?: string;
    page?: number;
    pageSize?: number;
  } = {}): Observable<PointEventResponse[]> {
    let httpParams = new HttpParams();

    if (params.re) {
      httpParams = httpParams.set('re', params.re);
    }

    if (params.eventType) {
      httpParams = httpParams.set('eventType', params.eventType);
    }

    if (params.referenceId) {
      httpParams = httpParams.set('referenceId', params.referenceId);
    }

    httpParams = httpParams
      .set('page', params.page ?? 1)
      .set('pageSize', params.pageSize ?? 500);

    return this.http.get<PointEventResponse[]>(`${this.apiUrl}/events`, { params: httpParams });
  }

  getRules(): Observable<PointRule[]> {
    return this.http.get<PointRule[]>(`${this.apiUrl}/rules`);
  }

  updateRule(id: number, payload: UpdatePointRuleRequest): Observable<PointRule> {
    return this.http.put<PointRule>(`${this.apiUrl}/rules/${id}`, payload);
  }

  private hasCompleteIdentity(identity: Partial<PointIdentity> | null | undefined): identity is PointIdentity {
    return !!identity?.name?.trim() && !!identity?.re?.trim() && !!identity?.sector?.trim();
  }
}
