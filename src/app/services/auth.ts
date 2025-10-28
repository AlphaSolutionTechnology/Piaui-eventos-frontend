import { environment } from './../../../enviroment';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of, map, throwError, switchMap } from 'rxjs';

// Interface para a resposta esperada da API de login
// O backend retorna: { "message": "...", "accessToken": "..." }
export interface AuthResponse {
  accessToken?: string; // Token JWT principal (formato do backend)
  token?: string; // Formato alternativo
  auth_token?: string; // Formato alternativo
  jwt?: string; // Formato alternativo
  message?: string; // Mensagem de sucesso do backend
  user?: {
    name: string;
    email: string;
    password?: string;
  };
}

// Interface para a resposta do endpoint /api/user/me
// Estrutura REAL retornada pelo backend
export interface UserMeResponse {
  user: string; // Nome do usuário
  role: string; // Role como string simples ("user", "admin", etc.)
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
      switchMap((response: AuthResponse) => {
        // Buscar dados do usuário e aguardar conclusão antes de continuar
        return this.fetchCurrentUser().pipe(
          map(() => response) // Retornar a resposta original do login
        );
      }),
      catchError((error) => {
        console.error('Erro na requisição de login:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Busca os dados do usuário autenticado do backend via /api/user/me
   * Este método deve ser chamado após o login ou ao inicializar o app
   */
  fetchCurrentUser(): Observable<User | null> {
    return this.http.get<UserMeResponse>(`${this.apiUrl}/user/me`).pipe(
      map((response: UserMeResponse): User => {
        const user: User = {
          id: 0, // Backend não retorna ID
          name: response.user, // Nome vem no campo "user"
          email: '', // Backend não retorna email
          phoneNumber: '', // Backend não retorna telefone
          role: this.translateRole(response.role.toUpperCase()), // Role vem como string simples
          roleId: 0, // Backend não retorna roleId
          avatar: '', // Backend não retorna avatar
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
        // Não logar erro se for 403/401 em /user/me - é esperado quando não está autenticado
        if (error.status !== 401 && error.status !== 403) {
          console.error('Erro ao buscar dados do usuário:', error);
        }

        if (error.status === 401 || error.status === 403) {
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
   * Faz logout chamando o backend e limpando dados locais
   * O backend limpa os cookies accessToken e refreshToken (MaxAge=0)
   * Retorna Observable para permitir que o componente aguarde a conclusão
   */
  logout(): Observable<void> {
    if (!this.isBrowser) {
      return of(undefined);
    }

    // SEMPRE limpar cookies localmente, pois cookies HttpOnly não podem ser removidos via JS
    // Se o backend conseguir limpar, ótimo; se não, garantimos limpeza local
    const needsLocalCookieCleanup = true;

    // Chamar endpoint de logout no backend
    // O backend irá limpar os cookies accessToken e refreshToken
    return this.http.post(`${this.apiUrl}/auth/logout`, {}).pipe(
      tap(() => {
        console.log('✅ Logout realizado no servidor - backend tentou limpar cookies');
      }),
      catchError((error) => {
        // Se receber 403, pode ser que os cookies já expiraram ou sessão inválida
        // Neste caso, limpamos os cookies localmente
        if (error.status === 403) {
          console.warn('⚠️ 403 Forbidden - Sessão inválida');
        } else {
          console.error('⚠️ Erro ao chamar endpoint de logout:', error);
        }
        // Mesmo com erro, continuamos com a limpeza local
        return of(null);
      }),
      map(() => {
        // Limpar dados locais após resposta do servidor (ou erro)
        this.clearLocalData(needsLocalCookieCleanup);
        return undefined;
      })
    );
  }

  /**
   * Limpa apenas os dados locais (localStorage)
   * Os cookies são limpos pelo backend via endpoint /auth/logout
   * Em caso de erro 403, também limpa cookies localmente como fallback
   */
  private clearLocalData(forceClearCookies: boolean = false): void {
    if (this.isBrowser) {
      // Limpar localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');

      // Se forceClearCookies=true ou houve erro no backend, limpar cookies localmente
      if (forceClearCookies) {
        console.log('🧹 Limpando cookies localmente (fallback)');

        // Tentar múltiplas combinações de atributos para garantir remoção
        const cookieNames = ['accessToken', 'refreshToken'];
        const paths = ['/', '/api'];
        const domains = [window.location.hostname, `.${window.location.hostname}`, ''];

        cookieNames.forEach((name) => {
          paths.forEach((path) => {
            domains.forEach((domain) => {
              // Tentar com diferentes combinações de atributos
              const domainAttr = domain ? `domain=${domain};` : '';

              // Versão 1: Com todos os atributos
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; ${domainAttr} SameSite=Strict; Secure`;

              // Versão 2: Sem Secure (caso esteja em HTTP local)
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; ${domainAttr} SameSite=Strict`;

              // Versão 3: Sem SameSite
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; ${domainAttr}`;

              // Versão 4: Apenas path
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;

              // Versão 5: Sem path nem domain
              document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
            });
          });
        });
      }

      console.log('✅ Dados locais limpos (localStorage)');
      console.log(
        'ℹ️ Cookies accessToken/refreshToken',
        forceClearCookies ? 'limpos localmente' : 'foram limpos pelo backend'
      );
    }

    this.currentUserSubject.next(null);
  }

  /**
   * Limpa todos os dados do usuário (usado pelo interceptor em caso de 401)
   */
  private clearUserData(): void {
    if (this.isBrowser) {
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');

      // Em caso de 401, também tentamos limpar cookies localmente como fallback
      // (normalmente o backend já teria expirado/invalidado)
      document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
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

  /**
   * Recupera o token de autenticação
   * Com cookies HttpOnly, não podemos ler o token via JavaScript
   * Retornamos null, mas o navegador envia o cookie automaticamente
   */
  getToken(): string | null {
    // Cookies HttpOnly não são acessíveis via JavaScript
    return null;
  }

  /**
   * Verifica se o usuário está autenticado
   * Como usamos cookies HttpOnly, verificamos se há dados do usuário em cache
   */
  isAuthenticated(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    // Verificar se há dados do usuário no localStorage
    const userJson = localStorage.getItem('user');
    return !!userJson;
  }

  /**
   * Atualiza o token de autenticação (refresh token)
   * O backend gerencia os cookies automaticamente
   */
  refreshToken(): Observable<any> {
    const refreshUrl = `${this.apiUrl}/auth/refresh`;

    return this.http.post<any>(refreshUrl, {}).pipe(
      tap((response) => {
        // Backend atualiza os cookies automaticamente
        // Apenas recarregar dados do usuário
        this.fetchCurrentUser().subscribe();
      }),
      catchError((error) => {
        console.error('Erro ao renovar token:', error);
        // Se falhar, fazer logout
        this.logout();
        return of(null);
      })
    );
  }
}
