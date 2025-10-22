import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { response } from 'express';

export interface AuthResponse {
  token: string;
  user: {
    name: string;
    email: string;
    password: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `http://localhost:8080/api/auth/login`;

  private refreshUrl = 'http://localhost:8080/api/auth/refresh';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    const credentials = { username: email, password };
    return this.http.post<AuthResponse>(this.apiUrl, credentials);
  }

  //funciona , porém seria melhor dentro de um 'httpinterceptor'
  refreshToken(): Observable<any> {
    const token = this.getToken();
    return this.http.post<any>(this.refreshUrl, { token }).pipe(
      tap((response) => {
        this.setToken(response.token);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  setToken(token: string) {
    localStorage.setItem('accessToken', token);
  }
}
