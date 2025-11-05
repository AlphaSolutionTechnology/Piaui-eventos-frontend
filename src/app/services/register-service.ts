import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../enviroment';

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
}

@Injectable({
  providedIn: 'root',
})
export class RegisterService {
  private apiUrl = environment.API_URL;

  constructor(private http: HttpClient) {}

  /**
   * Registra um novo usuário
   * O authInterceptor adiciona automaticamente withCredentials: true para enviar cookies HTTP-only
   */
  register(
    name: string,
    email: string,
    password: string,
    phoneNumber: string,
    roleId: number = 2
  ): Observable<UserResponse> {
    const userData = {
      id: null,
      name,
      email,
      password,
      phoneNumber,
      roleId,
    };
    return this.http.post<UserResponse>(`${this.apiUrl}/user`, userData);
  }
}
