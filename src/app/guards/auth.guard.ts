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

  if (authService.isAuthenticated()) {
    // Se estiver autenticado mas não tiver dados do usuário, buscar do backend
    if (!authService.getCurrentUser()) {
      authService.fetchCurrentUser().subscribe({
        error: () => {
          // Se falhar ao buscar usuário, redirecionar para login
          router.navigate(['/login']);
        },
      });
    }
    return true;
  }

  // Não autenticado - redirecionar para login
  console.warn('Acesso negado - redirecionando para login');
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
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
      console.warn(`Acesso negado - role ${requiredRole} requerida`);
      router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  };
};
