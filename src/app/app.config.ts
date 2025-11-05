import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { AuthService } from './services/auth';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { inject } from '@angular/core';

/**
 * Função de inicialização da aplicação
 * Verifica se o usuário tem cookies HTTP-only válidos e tenta restaurar a sessão
 */
function initializeApp() {
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  return () => {
    // Só executar no browser
    if (!isPlatformBrowser(platformId)) {
      return Promise.resolve();
    }

    // Verificar se há dados do usuário no localStorage
    const userJson = localStorage.getItem('user');
    
    if (userJson) {
      // Já tem dados, validar com o backend em background
      console.log('🔍 Verificando sessão existente com cookies HTTP-only...');
      
      return authService.fetchCurrentUser().toPromise()
        .then(() => {
          console.log('✅ Sessão validada com sucesso');
        })
        .catch((error) => {
          // Se falhar (401/403), os dados serão limpos pelo fetchCurrentUser
          if (error?.status === 401 || error?.status === 403) {
            console.log('⚠️ Sessão expirada - cookies HTTP-only inválidos');
          }
        });
    } else {
      // Não há dados no localStorage, mas pode ter cookies HTTP-only válidos
      // Tentar restaurar sessão silenciosamente
      console.log('🔍 Tentando restaurar sessão via cookies HTTP-only...');
      
      return authService.fetchCurrentUser().toPromise()
        .then((user) => {
          if (user) {
            console.log('✅ Sessão restaurada via cookies HTTP-only');
          } else {
            console.log('ℹ️ Nenhuma sessão ativa');
          }
        })
        .catch(() => {
          // Silenciosamente falha - usuário não está autenticado
          console.log('ℹ️ Nenhuma sessão ativa');
        });
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    // Inicializar autenticação ao carregar o app
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      multi: true,
    },
  ],
};
