import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';
import { map, catchError, of, switchMap } from 'rxjs';

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
    console.log('✅ [AuthGuard] Usuário autenticado - permitindo acesso');
    
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
  console.log('🔍 [AuthGuard] Não há dados em memória - tentando validar via cookies HTTP-only...');

  // Tentar obter usuário diretamente via cookies HTTP-only
  return authService.fetchCurrentUser().pipe(
    map((user) => {
      if (user) {
        console.log('✅ [AuthGuard] Sessão restaurada via cookies - permitindo acesso');
        return true;
      }
      console.log('⚠️ [AuthGuard] Sem sessão válida - redirecionando para login');
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }),
    catchError((error) => {
      // 🔑 REGRA IMPORTANTE:
      // - 401 (Unauthorized): Token inválido, mas pode tentar refresh
      // - 403 (Forbidden): Sessão completamente inválida, NÃO tente refresh
      
      if (error && error.status === 401) {
        // Token pode estar expirado, tentar renovar via refresh
        console.log('🔒 [AuthGuard] 401 Unauthorized - tentando refresh token...');
        return authService.refreshToken().pipe(
          switchMap(() =>
            authService.fetchCurrentUser().pipe(
              map((user) => {
                if (user) {
                  console.log('✅ [AuthGuard] Sessão restaurada via refresh - permitindo acesso');
                  return true;
                }
                console.log('⚠️ [AuthGuard] Refresh não retornou usuário - redirecionando para login');
                router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
                return false;
              })
            )
          ),
          catchError((refreshError) => {
            console.warn('❌ [AuthGuard] Falha ao renovar sessão (refresh retornou', refreshError?.status, ')');
            router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
            return of(false);
          })
        );
      }

      if (error && error.status === 403) {
        // 403 = Sessão inválida/expirada, não tente refresh
        console.log('🔒 [AuthGuard] 403 Forbidden - Sessão inválida/expirada - redirecionando para login');
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return of(false);
      }

      // Outros erros (500, network, etc): redirecionar para login
      console.error('❌ [AuthGuard] Erro ao validar sessão:', error?.status, error?.message);
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return of(false);
    })
  );
};

/**
 * Guard que permite acesso à rota mas tenta restaurar usuário se houver cookies válidos
 * Não redireciona para login, apenas tenta carregar dados via cookies
 * Útil para rotas que não precisam estar 100% autenticadas no início
 */
export const softAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);

  // Se já está autenticado, permitir
  if (authService.isAuthenticated()) {
    console.log('✅ [SoftAuthGuard] Usuário autenticado');
    return true;
  }

  // Tentar validar via cookies, mas não redireciona se falhar
  console.log('🔍 [SoftAuthGuard] Tentando restaurar sessão via cookies...');
  
  return authService.fetchCurrentUser().pipe(
    map((user) => {
      if (user) {
        console.log('✅ [SoftAuthGuard] Sessão restaurada via cookies');
      } else {
        console.log('ℹ️ [SoftAuthGuard] Sem sessão válida, mas permitindo acesso à rota pública');
      }
      return true; // ✅ SEMPRE permite acesso
    }),
    catchError((error) => {
      console.warn('⚠️ [SoftAuthGuard] Erro ao validar cookies, mas permitindo acesso:', error.status);
      return of(true); // ✅ SEMPRE permite acesso mesmo com erro
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
