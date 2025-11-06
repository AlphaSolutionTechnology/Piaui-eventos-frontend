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

        if (error.status === 403 && !isLoginEndpoint && !isLogoutEndpoint && !isRefreshEndpoint) {
          console.log('🔄 [401] Tentando renovar token via /auth/refresh');
          
          return http.post<{ message: string; accessToken: string }>(
            `${environment.API_URL}/auth/refresh`,
            {},
            { withCredentials: true }
          ).pipe(
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

        if (error.status === 401 && !isLoginEndpoint && !isLogoutEndpoint) {
          localStorage.removeItem('user');
          console.log('🔒 [401] Sessão expirada - redirecionando para login');
          router.navigate(['/login']);
        } else if (error.status === 403 && isUserMeEndpoint) {
          localStorage.removeItem('user');
          console.log('⚠️ [403] /user/me - dados locais limpos');
        } else if (error.status === 403 && isLogoutEndpoint) {
          console.log('⚠️ [403] Logout - sessão já expirada');
        } else if (error.status === 403 && !isLoginEndpoint) {
          localStorage.removeItem('user');
          console.log('🔒 [403] Acesso negado - redirecionando para login');
          router.navigate(['/login']);
        }
      }

      return throwError(() => error);
    })
  );
};
