import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { jwtDecode } from 'jwt-decode';
import { OnlineService } from "./online.service";

export interface JwtPayload {
  id: number;
  email: string;
  username: string;
  role: string;
  department: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly tokenKey = 'jwt';

  constructor(private http: HttpClient, private signalrService: OnlineService) { }

  /** ------------------- Auth Methods ------------------- **/

  login(userName: string, password: string): Observable<any> {
    return this.http.post<{ precisaTrocarSenha: false; userId: number; token: string }>(`${this.apiUrl}/login`, { userName, password })
      .pipe(
        tap(res => {
          if (!res.precisaTrocarSenha) {
            this.storeToken(res.token);

            // Iniciar SignalR - passar o token diretamente
            this.signalrService.startConnection(res.token);
          } else {
            this.clearToken();
          }
        })
      );
  }

  register(email: string, password: string): Observable<any> {
    return this.http.post<{ token?: string }>(`${this.apiUrl}/register`, { email, password })
      .pipe(
        tap(res => {
          if (res.token) {
            this.storeToken(res.token);

            // Iniciar SignalR após registro
            this.signalrService.startConnection(res.token);
          }
        })
      );
  }

  logout(): void {
    this.clearToken();
    this.signalrService.stopConnection();
    location.href = '/';
  }

  /** ------------------- Token Helpers ------------------- **/

  private storeToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const decoded = jwtDecode<{ exp: number }>(token);
      if (!decoded.exp) return true;

      const now = Math.floor(Date.now() / 1000);
      return decoded.exp < now; // true se expirado
    } catch {
      return true;
    }
  }

  /** ------------------- User Info ------------------- **/

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUserInfo(): JwtPayload | null;
  getUserInfo<T extends keyof JwtPayload>(field: T): JwtPayload[T] | null;
  getUserInfo<T extends keyof JwtPayload>(field?: T): JwtPayload | JwtPayload[T] | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      if (decoded.id !== undefined) {
        decoded.id = Number(decoded.id);
      }

      return field ? decoded[field] : decoded;
    } catch (error) {
      console.error('Invalid JWT token:', error);
      return null;
    }
  }
}
