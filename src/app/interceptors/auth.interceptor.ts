import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

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

  // Clone a requisição para incluir credenciais (cookies)
  // Isso é necessário para que o navegador envie os cookies HttpOnly automaticamente
  const clonedReq = req.clone({
    withCredentials: true,
  });

  // Continua com a requisição e trata erros
  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Se receber 401 (Unauthorized) ou 403 (Forbidden)
      if ((error.status === 401 || error.status === 403) && isPlatformBrowser(platformId)) {
        const isUserMeEndpoint = error.url?.includes('/user/me');
        const isLoginEndpoint = error.url?.includes('/auth/login');
        const isLogoutEndpoint = error.url?.includes('/auth/logout');

        // SEGURANÇA: 401 sempre significa sessão expirada - redirecionar imediatamente
        if (error.status === 401 && !isLoginEndpoint && !isLogoutEndpoint) {
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          console.log('🔒 [401] Sessão expirada - redirecionando para login');
          router.navigate(['/login']);
        }
        // 403 em /user/me apenas limpa dados (pode não estar autenticado)
        else if (error.status === 403 && isUserMeEndpoint) {
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          console.log('⚠️ [403] /user/me - dados locais limpos');
        }
        // 403 em logout é esperado (sessão já expirada)
        else if (error.status === 403 && isLogoutEndpoint) {
          console.log('⚠️ [403] Logout - sessão já expirada');
        }
        // 403 em login é erro de credenciais - não fazer nada
        else if (error.status === 403 && isLoginEndpoint) {
          // Erro de credenciais, deixa o componente de login tratar
        }
        // SEGURANÇA: Qualquer outro 403 em endpoint protegido = sessão expirada
        else if (error.status === 403) {
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          console.log('🔒 [403] Acesso negado - sessão expirada ou sem permissão - redirecionando para login');
          router.navigate(['/login']);
        }
      }

      return throwError(() => error);
    })
  );
};
