import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, tap } from "rxjs";
import { environment } from "../../environments/environment";
import { jwtDecode } from 'jwt-decode';

export interface JwtPayload {
  email: string;
  username: string;
  role: string;
  nameidentifier: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`

  constructor(private http: HttpClient) { }

  login(userName: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { userName, password }).pipe(
      tap((res: any) => localStorage.setItem('jwt', res.token))
    );
  }

  register(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { email, password }).pipe(
      tap((res: any) => {
        if (res.token) {
          localStorage.setItem('jwt', res.token);
        }
      })
    );
  }

  logout() {
    localStorage.removeItem('jwt');
    location.href = '/'
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('jwt');
  }

  getUserRole(): string | null {
    const token = localStorage.getItem('jwt');
    if (!token) return null;

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return decoded.role;
    } catch {
      return null;
    }
  }

  getUserUserName(): string | null {
    const token = localStorage.getItem('jwt');
    if (!token) return null;

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      console.log(decoded)
      return decoded.username;
    } catch {
      return null;
    }
  }
}
