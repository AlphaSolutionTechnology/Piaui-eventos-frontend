import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../enviroment';

/**
 * Interceptor HTTP para:
 * 1. Garantir que as requisições incluam credenciais (cookies)
 * 2. Tratar erros de autenticação (401/403) e tentar refresh automático
 * 3. Redirecionar para login apenas quando refresh falhar
 *
 * IMPORTANTE: O backend usa cookies HttpOnly para autenticação (accessToken e refreshToken).
 * Os cookies são enviados automaticamente pelo navegador com withCredentials: true
 * 
 * FLUXO DE AUTENTICAÇÃO:
 * - 401: Token expirado → Tenta refresh automático → Repete requisição
 * - 403: Acesso negado → Tenta refresh automático → Repete requisição  
 * - Se refresh falhar → Remove dados locais → Redireciona para /login
 * - Endpoints públicos (eventos, register) → Propaga erro sem tentar refresh
 * - /user/me → Propaga erro para que o guard trate (não bloqueia navegação)
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const http = inject(HttpClient);

  const clonedReq = req.clone({
    withCredentials: true,
  });

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if ((error.status === 401 || error.status === 403) && isPlatformBrowser(platformId)) {
        const isUserMeEndpoint = error.url?.includes('/user/me');
        const isLoginEndpoint = error.url?.includes('/auth/login');
        const isLogoutEndpoint = error.url?.includes('/auth/logout');
        const isRefreshEndpoint = error.url?.includes('/auth/refresh');
        const isEventsEndpoint = error.url?.includes('/events');
        const isRegisterEndpoint = error.url?.includes('/register');

        // ✅ NÃO redirecionar para endpoints públicos ou quando usuário não está autenticado
        if (isUserMeEndpoint && (error.status === 401 || error.status === 403)) {
          console.log(
            '⚠️ [' + error.status + '] /user/me - usuário não autenticado, propagando erro'
          );
          // Retornar erro sem redirecionar - o guard vai lidar com isso
          return throwError(() => error);
        }

        // ✅ NÃO redirecionar para endpoints públicos ou de registro (eventos, inscrição, etc)
        if (
          (isEventsEndpoint || isRegisterEndpoint) &&
          (error.status === 401 || error.status === 403)
        ) {
          console.log(
            '⚠️ [' +
              error.status +
              '] Acesso a recurso de eventos/inscrição - retornando erro para serviço tratar'
          );
          return throwError(() => error);
        }

        // ✅ NÃO tentar refresh se for erro do próprio endpoint de refresh
        if (isRefreshEndpoint) {
          console.log('❌ [' + error.status + '] Erro no endpoint de refresh - propagando erro');
          return throwError(() => error);
        }

        // 🔄 Tentar refresh de token para 401 (token expirado) e 403 (acesso negado)
        // EXCETO para endpoints públicos, login, logout, refresh
        if (
          (error.status === 401 || error.status === 403) &&
          !isLoginEndpoint &&
          !isLogoutEndpoint &&
          !isRefreshEndpoint &&
          !isEventsEndpoint &&
          !isRegisterEndpoint &&
          !isUserMeEndpoint
        ) {
          console.log('🔄 [' + error.status + '] Tentando renovar token via /auth/refresh');

          return http
            .post<{ message: string; accessToken?: string }>(
              `${environment.API_URL}/auth/refresh`,
              {},
              { withCredentials: true }
            )
            .pipe(
              switchMap((refreshResponse) => {
                console.log('✅ Token renovado com sucesso, repetindo requisição original');
                // Verificar se o backend retornou um novo accessToken (opcional)
                if (refreshResponse && refreshResponse.accessToken) {
                  console.log('✅ Novo accessToken recebido do backend');
                }
                const retryReq = req.clone({ withCredentials: true });
                return next(retryReq);
              }),
              catchError((refreshError) => {
                console.log('❌ Falha ao renovar token (status: ' + refreshError.status + ') - redirecionando para login');
                localStorage.removeItem('user');
                router.navigate(['/login']);
                return throwError(() => refreshError);
              })
            );
        }

        // Se chegou aqui e é logout com 403, não fazer nada (logout já foi tratado)
        if (error.status === 403 && isLogoutEndpoint) {
          console.log('⚠️ [403] Logout - sessão já expirada');
          return throwError(() => error);
        }
      }

      return throwError(() => error);
    })
  );
};
