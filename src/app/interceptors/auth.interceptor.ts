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
      // Se receber 401 (Unauthorized) ou 403 (Forbidden) em /api/user/me, apenas limpar dados locais
      // Não redirecionar para login pois pode ser inicialização normal sem autenticação
      if ((error.status === 401 || error.status === 403) && isPlatformBrowser(platformId)) {
        // Se for a rota /api/user/me, apenas limpar dados locais (usuário não está autenticado)
        if (error.url?.includes('/user/me')) {
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          console.log('⚠️ Usuário não autenticado - dados locais limpos');
        }
        // Se for outra rota protegida, redirecionar para login
        else if (!error.url?.includes('/auth/login')) {
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
          document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          console.log('🔒 Sessão expirada - redirecionando para login');
          router.navigate(['/login']);
        }
      }

      return throwError(() => error);
    })
  );
};
