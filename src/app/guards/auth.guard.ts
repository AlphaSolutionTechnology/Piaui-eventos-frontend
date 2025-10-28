import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth';

/**
 * Guard para proteger rotas que requerem autenticação
 * Verifica se o usuário está autenticado, caso contrário redireciona para /login
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verifica se está autenticado (tem dados no localStorage)
  if (!authService.isAuthenticated()) {
    // Não autenticado - redirecionar para login
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // SEGURANÇA: Tem dados no localStorage, mas vamos validar com o backend
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    // Inconsistência: isAuthenticated() retornou true mas getCurrentUser() é null
    // Limpar dados e redirecionar
    console.warn('⚠️ Inconsistência detectada - limpando dados e redirecionando');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Usuário autenticado com dados válidos - permitir acesso
  // Tentar atualizar dados do backend em background (não bloqueia navegação)
  authService.fetchCurrentUser().subscribe({
    error: (error) => {
      // Se backend retornar 401/403, o interceptor vai lidar com logout
      // Aqui apenas logamos para debug
      if (error.status === 401 || error.status === 403) {
        console.warn('⚠️ [AuthGuard] Sessão pode estar expirada - interceptor vai tratar');
      }
    },
  });

  return true;
};

/**
 * Guard para proteger rotas baseado em role do usuário
 * Exemplo de uso: canActivate: [roleGuard('ADMIN')]
 */
export const roleGuard = (requiredRole: string): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    if (!authService.hasRole(requiredRole)) {
      router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  };
};
