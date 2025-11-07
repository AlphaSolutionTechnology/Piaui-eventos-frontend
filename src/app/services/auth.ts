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
// Estrutura REAL retornada pelo backend:
// {
//   "id": 25,
//   "name": "Andre Lucas",
//   "email": "andrelucas_pi@proton.me",
//   "phoneNumber": "86995855963",
//   "role": {
//     "roleId": 1,
//     "roleName": "admin"
//   }
// }
export interface UserMeResponse {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  role: {
    roleId: number;
    roleName: string;
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
   * O backend retorna cookies HTTP-only (accessToken e refreshToken) que são gerenciados automaticamente
   * O authInterceptor adiciona withCredentials: true para enviar os cookies em todas as requisições
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
   * O authInterceptor adiciona automaticamente withCredentials: true para enviar cookies HTTP-only
   *
   * Backend retorna:
   * {
   *   "id": 25,
   *   "name": "Andre Lucas",
   *   "email": "andrelucas_pi@proton.me",
   *   "phoneNumber": "86995855963",
   *   "role": { "roleId": 1, "roleName": "admin" }
   * }
   *
   * ⚠️ IMPORTANTE: Este método PROPAGA o erro 401/403 para que o guard possa tratá-lo
   * O guard sabe quando há erro vs quando não há sessão
   */
  fetchCurrentUser(): Observable<User | null> {
    return this.http.get<UserMeResponse>(`${this.apiUrl}/user/me`).pipe(
      map((response: UserMeResponse): User => {
        const user: User = {
          id: response.id,
          name: response.name,
          email: response.email,
          phoneNumber: response.phoneNumber,
          role: this.translateRole(response.role.roleName.toUpperCase()),
          roleId: response.role.roleId,
          avatar: '', // Backend não retorna avatar ainda
        };

        console.log('✅ Dados do usuário recebidos:', {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          roleId: user.roleId,
        });

        // Atualizar BehaviorSubject
        this.currentUserSubject.next(user);

        // Salvar no localStorage para cache (apenas no browser)
        if (this.isBrowser) {
          localStorage.setItem('user', JSON.stringify(user));
        }

        return user;
      }),
      catchError((error) => {
        // ⚠️ IMPORTANTE: Limpar dados se receber 401/403
        if (error.status === 401 || error.status === 403) {
          console.warn(
            `⚠️ [fetchCurrentUser] ${error.status} - Sessão inválida ou cookies expirados`
          );
          this.clearUserData();
        } else {
          console.error('❌ Erro ao buscar dados do usuário:', error);
        }

        // PROPAGAR o erro para que o guard possa tratá-lo adequadamente
        // O guard diferencia entre "usuário não autenticado" e "erro de rede"
        return throwError(() => error);
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
   * O backend limpa os cookies HTTP-only (accessToken e refreshToken) definindo MaxAge=0
   * Cookies HTTP-only não podem ser manipulados via JavaScript, são gerenciados automaticamente pelo navegador
   * Retorna Observable para permitir que o componente aguarde a conclusão
   */
  logout(): Observable<void> {
    if (!this.isBrowser) {
      return of(undefined);
    }

    // Chamar endpoint de logout no backend
    // O backend irá limpar os cookies HTTP-only (accessToken e refreshToken)
    // O authInterceptor adiciona automaticamente withCredentials: true
    return this.http.post(`${this.apiUrl}/auth/logout`, {}).pipe(
      tap(() => {
        console.log('✅ Logout realizado no servidor - backend tentou limpar cookies');
      }),
      catchError((error) => {
        // Se receber 403, pode ser que os cookies já expiraram ou sessão inválida
        if (error.status === 403) {
          console.warn('⚠️ 403 Forbidden - Sessão inválida ou já expirada');
        } else {
          console.error('⚠️ Erro ao chamar endpoint de logout:', error);
        }
        // Mesmo com erro, continuamos com a limpeza local
        return of(null);
      }),
      map(() => {
        // Limpar dados locais (localStorage) após resposta do servidor
        // Cookies HTTP-only são gerenciados automaticamente pelo backend
        this.clearLocalData();
        return undefined;
      })
    );
  }

  /**
   * Limpa apenas os dados locais (localStorage)
   * Os cookies HTTP-only (accessToken e refreshToken) são gerenciados automaticamente pelo backend
   * Não podemos manipular cookies HTTP-only via JavaScript
   */
  private clearLocalData(): void {
    if (this.isBrowser) {
      // Limpar apenas dados do localStorage
      localStorage.removeItem('user');

      console.log('✅ Dados locais limpos (localStorage)');
      console.log(
        'ℹ️ Cookies accessToken/refreshToken são gerenciados automaticamente pelo backend (HTTP-only)'
      );
    }

    this.currentUserSubject.next(null);
  }

  /**
   * Limpa todos os dados do usuário (usado pelo interceptor em caso de 401)
   * Cookies HTTP-only são gerenciados automaticamente pelo backend
   */
  private clearUserData(): void {
    if (this.isBrowser) {
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

  /**
   * Recupera o token de autenticação
   * Com cookies HTTP-only, não podemos ler o token via JavaScript por motivos de segurança
   * Os cookies são enviados automaticamente pelo navegador com withCredentials: true
   * Retornamos null pois não temos acesso aos cookies HTTP-only via JavaScript
   */
  getToken(): string | null {
    // Cookies HTTP-only não são acessíveis via JavaScript
    // O navegador envia automaticamente com withCredentials: true
    return null;
  }

  /**
   * Verifica se o usuário está autenticado
   * Verifica tanto o BehaviorSubject (estado em memória) quanto o localStorage (persistência)
   * Os cookies HTTP-only são gerenciados automaticamente pelo navegador
   */
  isAuthenticated(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    // Verificar estado em memória (BehaviorSubject)
    const currentUser = this.currentUserSubject.value;
    if (currentUser !== null) {
      return true;
    }

    // Verificar se há dados do usuário no localStorage
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        // Se tem no localStorage mas não no BehaviorSubject, restaurar
        const user = JSON.parse(userJson) as User;
        this.currentUserSubject.next(user);
        return true;
      } catch (error) {
        // Se der erro no parse, limpar dados corrompidos
        console.error('Erro ao fazer parse dos dados do usuário:', error);
        localStorage.removeItem('user');
        return false;
      }
    }

    return false;
  }

  /**
   * Atualiza o token de autenticação (refresh token)
   * O backend gerencia os cookies HTTP-only automaticamente
   * O authInterceptor adiciona automaticamente withCredentials: true
   * Se o refresh falhar, não faz logout aqui (deixa o guard decidir)
   */
  refreshToken(): Observable<any> {
    const refreshUrl = `${this.apiUrl}/auth/refresh`;

    // Os cookies HTTP-only (incluindo refresh token) são enviados automaticamente
    // com withCredentials: true. Não precisa enviar o token no corpo.
    return this.http.post<any>(refreshUrl, {}).pipe(
      tap((response) => {
        console.log('✅ [refreshToken] Token renovado com sucesso');
        // Backend atualiza os cookies automaticamente
        // Apenas recarregar dados do usuário
        this.fetchCurrentUser().subscribe();
      }),
      catchError((error) => {
        // ⚠️ Não fazer logout aqui
        // Deixar o guard tratar o erro de refresh
        console.error('❌ [refreshToken] Erro ao renovar token:', error?.status);
        return throwError(() => error);
      })
    );
  }
}
