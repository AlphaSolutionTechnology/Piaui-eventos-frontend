import { environment } from './../../../enviroment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface para a resposta esperada da API (exemplo)
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
  private apiUrl =   environment.API_URL;

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    const credentials = { username: email, password };
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials);
  }
}
