import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, catchError, of } from 'rxjs';

/**
 * Guard para proteger rotas que requerem autenticação
 * Verifica se o usuário está autenticado, caso contrário tenta validar via cookies HTTP-only
 * Se não houver sessão válida, redireciona para /login
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verifica se está autenticado (tem dados no localStorage ou BehaviorSubject)
  if (authService.isAuthenticated()) {
    // Usuário autenticado - permitir acesso
    // Validar sessão em background (não bloqueia navegação)
    authService.fetchCurrentUser().subscribe({
      error: (error) => {
        // Se backend retornar 401/403, o interceptor vai lidar com logout
        if (error.status === 401 || error.status === 403) {
          console.warn('⚠️ [AuthGuard] Sessão expirada - interceptor vai redirecionar');
        }
      },
    });
    
    return true;
  }

  // Não tem dados no localStorage, mas pode ter cookies HTTP-only válidos
  // Tentar validar sessão antes de redirecionar para login
  console.log('🔍 [AuthGuard] Tentando validar sessão via cookies HTTP-only...');
  
  return authService.fetchCurrentUser().pipe(
    map((user) => {
      if (user) {
        // Sessão restaurada com sucesso via cookies HTTP-only
        console.log('✅ [AuthGuard] Sessão restaurada - permitindo acesso');
        return true;
      } else {
        // Não há sessão válida - redirecionar para login
        console.log('⚠️ [AuthGuard] Sem sessão válida - redirecionando para login');
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }
    }),
    catchError((error) => {
      // Erro ao validar sessão - redirecionar para login
      if (error.status === 401 || error.status === 403) {
        console.log('🔒 [AuthGuard] Sessão inválida ou expirada - redirecionando para login');
      } else {
        console.error('❌ [AuthGuard] Erro ao validar sessão:', error);
      }
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return of(false);
    })
  );
};

/**
 * Guard para proteger rotas baseado em role do usuário
 * Exemplo de uso: canActivate: [roleGuard('ADMIN')]
 * Tenta validar sessão via cookies HTTP-only se necessário
 */
export const roleGuard = (requiredRole: string): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Verifica se está autenticado
    if (authService.isAuthenticated()) {
      // Verificar role
      if (!authService.hasRole(requiredRole)) {
        console.warn(`⚠️ [RoleGuard] Usuário não tem a role necessária: ${requiredRole}`);
        router.navigate(['/unauthorized']);
        return false;
      }
      return true;
    }

    // Não autenticado - tentar validar via cookies HTTP-only
    console.log('🔍 [RoleGuard] Tentando validar sessão via cookies HTTP-only...');
    
    return authService.fetchCurrentUser().pipe(
      map((user) => {
        if (user && authService.hasRole(requiredRole)) {
          console.log('✅ [RoleGuard] Sessão restaurada com role válida');
          return true;
        } else if (user) {
          console.warn(`⚠️ [RoleGuard] Usuário não tem a role necessária: ${requiredRole}`);
          router.navigate(['/unauthorized']);
          return false;
        } else {
          console.log('⚠️ [RoleGuard] Sem sessão válida - redirecionando para login');
          router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
          return false;
        }
      }),
      catchError((error) => {
        console.log('🔒 [RoleGuard] Erro ao validar sessão - redirecionando para login');
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return of(false);
      })
    );
  };
};
