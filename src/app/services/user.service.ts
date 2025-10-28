import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../enviroment';
import { User } from './auth';

// Interface para atualização de perfil
export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phoneNumber?: string;
  currentPassword?: string;
  newPassword?: string;
}

// Interface para resposta de perfil completo
export interface UserProfileResponse {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  roleId: number;
  avatar?: string;
  createdAt?: string;
  eventsAttended?: number;
  eventsOrganized?: number;
}

// Interface para estatísticas do usuário
export interface UserStats {
  eventsAttended: number;
  eventsOrganized: number;
  totalEvents: number;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private apiUrl = environment.API_URL;
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /**
   * Busca o perfil completo do usuário autenticado
   */
  getUserProfile(): Observable<UserProfileResponse> {
    return this.http.get<UserProfileResponse>(`${this.apiUrl}/user/me`).pipe(
      catchError((error) => {
        console.error('Erro ao buscar perfil do usuário:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Atualiza o perfil do usuário
   */
  updateUserProfile(data: UpdateProfileRequest): Observable<UserProfileResponse> {
    return this.http.put<UserProfileResponse>(`${this.apiUrl}/user/profile`, data).pipe(
      tap((response) => {
        console.log('✅ Perfil atualizado com sucesso');

        // Atualizar localStorage se for browser
        if (this.isBrowser) {
          const userJson = localStorage.getItem('user');
          if (userJson) {
            const user = JSON.parse(userJson) as User;
            user.name = response.name || user.name;
            user.email = response.email || user.email;
            user.phoneNumber = response.phoneNumber || user.phoneNumber;
            localStorage.setItem('user', JSON.stringify(user));
          }
        }
      }),
      catchError((error) => {
        console.error('Erro ao atualizar perfil:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Busca as estatísticas do usuário
   */
  getUserStats(): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.apiUrl}/user/me`).pipe(
      catchError((error) => {
        console.error('Erro ao buscar estatísticas do usuário:', error);
        // Retornar estatísticas vazias em caso de erro
        return throwError(() => error);
      })
    );
  }

  /**
   * Atualiza a foto de perfil (avatar)
   */
  updateAvatar(file: File): Observable<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    return this.http.post<{ avatarUrl: string }>(`${this.apiUrl}/user/avatar`, formData).pipe(
      tap((response) => {
        console.log('✅ Avatar atualizado com sucesso');

        // Atualizar localStorage
        if (this.isBrowser) {
          const userJson = localStorage.getItem('user');
          if (userJson) {
            const user = JSON.parse(userJson) as User;
            user.avatar = response.avatarUrl;
            localStorage.setItem('user', JSON.stringify(user));
          }
        }
      }),
      catchError((error) => {
        console.error('Erro ao atualizar avatar:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Deleta a conta do usuário
   */
  deleteAccount(password: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/user/delete`, { password }).pipe(
      tap(() => {
        console.log('✅ Conta deletada com sucesso');

        // Limpar dados locais
        if (this.isBrowser) {
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
        }
      }),
      catchError((error) => {
        console.error('Erro ao deletar conta:', error);
        return throwError(() => error);
      })
    );
  }
}
