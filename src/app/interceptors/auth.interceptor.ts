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
 * 2. Tratar erros de autenticação (401)
 *
 * IMPORTANTE: O backend usa cookies HttpOnly para autenticação (accessToken e refreshToken).
 * Os cookies são enviados automaticamente pelo navegador com withCredentials: true
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
            '⚠️ [' + error.status + '] /user/me - usuário não autenticado, continuando sem dados'
          );
          // Retornar erro sem redirecionar para não quebrar navegação
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

        // 🔄 Tentar refresh de token APENAS para endpoints que não sejam públicos, eventos ou refresh
        if (
          error.status === 403 &&
          !isLoginEndpoint &&
          !isLogoutEndpoint &&
          !isRefreshEndpoint &&
          !isEventsEndpoint &&
          !isRegisterEndpoint
        ) {
          console.log('🔄 [403] Tentando renovar token via /auth/refresh');

          return http
            .post<{ message: string; accessToken: string }>(
              `${environment.API_URL}/auth/refresh`,
              {},
              { withCredentials: true }
            )
            .pipe(
              switchMap(() => {
                console.log('✅ Token renovado com sucesso, repetindo requisição original');
                const retryReq = req.clone({ withCredentials: true });
                return next(retryReq);
              }),
              catchError((refreshError) => {
                console.log('❌ Falha ao renovar token - redirecionando para login');
                localStorage.removeItem('user');
                router.navigate(['/login']);
                return throwError(() => refreshError);
              })
            );
        }

        if (
          error.status === 401 &&
          !isLoginEndpoint &&
          !isLogoutEndpoint &&
          !isEventsEndpoint &&
          !isRegisterEndpoint
        ) {
          localStorage.removeItem('user');
          console.log('🔒 [401] Sessão expirada - redirecionando para login');
          router.navigate(['/login']);
        } else if (error.status === 403 && isLogoutEndpoint) {
          console.log('⚠️ [403] Logout - sessão já expirada');
        } else if (
          error.status === 403 &&
          !isLoginEndpoint &&
          !isEventsEndpoint &&
          !isRegisterEndpoint
        ) {
          localStorage.removeItem('user');
          console.log('🔒 [403] Acesso negado - redirecionando para login');
          router.navigate(['/login']);
        }
      }

      return throwError(() => error);
    })
  );
};
