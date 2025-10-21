import { environment } from './../../../enviroment';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, map } from 'rxjs';

// Interface para a resposta esperada da API de login
export interface AuthResponse {
  token: string;
  user: {
    name: string;
    email: string;
    password: string;
  };
}

// Interface para a resposta do endpoint /api/user/me
export interface UserMeResponse {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  role: {
    id: number;
    name: string; // "USER", "ADMIN", "MODERATOR", "ORGANIZER"
  };
}

// Interface do usuário para uso no frontend
export interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  role: string;
  roleId: number;
  avatar?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.API_URL;
  private isBrowser: boolean;

  // Subject para armazenar o estado do usuário atual
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Tentar carregar usuário do localStorage ao inicializar (apenas no browser)
    if (this.isBrowser) {
      this.loadUserFromLocalStorage();
    }
  }

  /**
   * Faz login do usuário
   */
  login(email: string, password: string): Observable<AuthResponse> {
    const credentials = { username: email, password };
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      tap((response) => {
        // Salvar token no localStorage (apenas no browser)
        if (this.isBrowser) {
          localStorage.setItem('authToken', response.token);
        }
        // Após login bem-sucedido, buscar dados completos do usuário
        this.fetchCurrentUser().subscribe();
      })
    );
  }

  /**
   * Busca os dados do usuário autenticado do backend via /api/user/me
   * Este método deve ser chamado após o login ou ao inicializar o app
   */
  fetchCurrentUser(): Observable<User | null> {
    return this.http
      .get<UserMeResponse>(`${this.apiUrl}/user/me`, {
        withCredentials: true,
      })
      .pipe(
        map((response: UserMeResponse): User => {
          console.log('Dados do usuário recebidos do backend:', response);

          const user: User = {
            id: response.id,
            name: response.name,
            email: response.email,
            phoneNumber: response.phoneNumber,
            role: this.translateRole(response.role.name),
            roleId: response.role.id,
            avatar: '', // Backend não retorna avatar, pode ser implementado depois
          };

          // Atualizar BehaviorSubject
          this.currentUserSubject.next(user);

          // Salvar no localStorage para cache (apenas no browser)
          if (this.isBrowser) {
            localStorage.setItem('user', JSON.stringify(user));
          }

          return user;
        }),
        catchError((error) => {
          console.error('Erro ao buscar dados do usuário:', error);

          if (error.status === 401) {
            console.warn('Usuário não autenticado - limpando dados');
            this.clearUserData();
          }

          return of(null);
        })
      );
  }

  /**
   * Traduz o role do backend para texto amigável em português
   */
  private translateRole(roleName: string): string {
    const roleMap: { [key: string]: string } = {
      USER: 'Participante',
      ADMIN: 'Administrador',
      MODERATOR: 'Moderador',
      ORGANIZER: 'Organizador',
    };

    return roleMap[roleName] || 'Participante';
  }

  /**
   * Carrega usuário do localStorage (usado na inicialização)
   * Mas sempre tenta buscar dados atualizados do backend
   * Apenas executa no browser
   */
  private loadUserFromLocalStorage(): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      const userJson = localStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson) as User;
        this.currentUserSubject.next(user);

        // Tentar atualizar com dados do backend (assíncrono)
        if (this.isAuthenticated()) {
          this.fetchCurrentUser().subscribe();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar usuário do localStorage:', error);
    }
  }

  /**
   * Retorna os dados do usuário atual (síncrono)
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Recupera o token de autenticação
   */
  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem('authToken');
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Verifica se o usuário tem uma role específica
   */
  hasRole(roleName: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Comparar com role em inglês ou português
    return user.role === roleName || user.role === this.translateRole(roleName);
  }

  /**
   * Verifica se o usuário é admin
   */
  isAdmin(): boolean {
    return this.hasRole('ADMIN') || this.hasRole('Administrador');
  }

  /**
   * Faz logout removendo os dados do localStorage e limpando o subject
   */
  logout(): void {
    this.clearUserData();
  }

  /**
   * Limpa todos os dados do usuário
   */
  private clearUserData(): void {
    if (this.isBrowser) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
    this.currentUserSubject.next(null);
  }

  /**
   * Gera as iniciais do nome do usuário para usar no avatar
   */
  getUserInitials(name: string): string {
    if (!name) return 'U';

    const names = name.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }

    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  }
}
