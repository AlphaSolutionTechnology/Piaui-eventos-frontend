import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { environment } from '../../../enviroment';
import { AuthService, User } from './auth';

/**
 * DTO para inscrição em evento - correspondente a UserRegistrationDTO do backend
 * Documentação: POST /api/events/{eventId}/register
 */
export interface UserRegistrationDTO {
  userId: number;
}

/**
 * Interface para resposta da API de inscrição
 */
export interface EventRegistrationResponse {
  id?: number;
  message?: string;
  success?: boolean;
  registrationId?: number;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EventRegistrationService {
  // Endpoint base conforme documentação do backend
  private apiUrl = environment.API_URL;

  private registrationLoadingSubject = new BehaviorSubject<boolean>(false);
  private registrationErrorSubject = new BehaviorSubject<string | null>(null);
  private isSubscribedSubject = new BehaviorSubject<boolean>(false);

  public registrationLoading$ = this.registrationLoadingSubject.asObservable();
  public registrationError$ = this.registrationErrorSubject.asObservable();
  public isSubscribed$ = this.isSubscribedSubject.asObservable();

  constructor(private authService: AuthService, @Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Inscreve um usuário em um evento
   * Endpoint: POST /api/events/{eventId}/register
   *
   * @param eventId - ID do evento
   * @param userId - ID do usuário
   * @returns Promise com resultado da inscrição
   */
  async registerUserToEvent(eventId: number, userId: number): Promise<void> {
    this.registrationLoadingSubject.next(true);
    this.registrationErrorSubject.next(null);

    try {
      // Preparar o payload conforme documentação do backend
      const payload: UserRegistrationDTO = {
        userId,
      };

      const token = this.getAccessToken();
      
      // Construir headers
      const headers: any = {
        'Content-Type': 'application/json',
      };

      // Adicionar Authorization header se tiver token
      if (token) {
        console.log('📤 [REGISTRATION] Adicionando Bearer token ao header');
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('📤 [REGISTRATION] Sem Bearer token - usando cookies HTTP-only');
      }

      const url = `${this.apiUrl}/events/${eventId}/register`;
      console.log(`📤 [REGISTRATION] POST ${url}`);
      console.log('📤 [REGISTRATION] Payload:', JSON.stringify(payload));

      // Chamar endpoint de inscrição
      const response = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include', // Enviar cookies (incluindo accessToken HTTP-only)
        body: JSON.stringify(payload),
      });

      console.log(`📥 [REGISTRATION] Response status: ${response.status} ${response.statusText}`);

      // Tratamento de erros baseado no status HTTP
      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        throw new Error(error);
      }

      console.log('✅ Inscrito com sucesso no evento!');
      this.isSubscribedSubject.next(true);
      this.registrationLoadingSubject.next(false);
    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error);
      this.registrationErrorSubject.next(errorMessage);
      console.error('❌ Erro ao inscrever:', errorMessage);
      this.registrationLoadingSubject.next(false);
      throw error;
    }
  }

  /**
   * Desinscreve um usuário de um evento
   * Endpoint: DELETE /api/events/{eventId}/register/{userId}
   *
   * @param eventId - ID do evento
   * @param userId - ID do usuário
   * @returns Promise com resultado da desinscrição
   */
  async unregisterUserFromEvent(eventId: number, userId: number): Promise<void> {
    this.registrationLoadingSubject.next(true);
    this.registrationErrorSubject.next(null);

    try {
      const token = this.getAccessToken();

      // Construir headers
      const headers: any = {};

      // Adicionar Authorization header se tiver token
      if (token) {
        console.log('📤 [UNREGISTER] Adicionando Bearer token ao header');
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.log('📤 [UNREGISTER] Sem Bearer token - usando cookies HTTP-only');
      }

      const url = `${this.apiUrl}/events/${eventId}/register/${userId}`;
      console.log(`📤 [UNREGISTER] DELETE ${url}`);

      // Chamar endpoint de desinscrição
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        credentials: 'include', // Enviar cookies
      });

      console.log(`📥 [UNREGISTER] Response status: ${response.status} ${response.statusText}`);

      // Status 204 No Content é o esperado para DELETE bem-sucedido
      if (response.status !== 204 && !response.ok) {
        const error = await this.handleErrorResponse(response);
        throw new Error(error);
      }

      console.log('✅ Desinscrição realizada com sucesso!');
      this.isSubscribedSubject.next(false);
      this.registrationLoadingSubject.next(false);
    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error);
      this.registrationErrorSubject.next(errorMessage);
      console.error('❌ Erro ao desinscrever:', errorMessage);
      this.registrationLoadingSubject.next(false);
      throw error;
    }
  }

  /**
   * Trata resposta de erro do servidor
   * @private
   */
  private async handleErrorResponse(response: Response): Promise<string> {
    switch (response.status) {
      case 400:
        return 'Dados inválidos. Verifique as informações.';
      case 401:
        return 'Sessão expirada. Por favor, faça login novamente.';
      case 403:
        return 'Você não tem permissão para realizar esta ação.';
      case 404:
        return 'Evento ou inscrição não encontrada.';
      case 409:
        return 'Você já está inscrito neste evento.';
      case 500:
        return 'Erro no servidor. Tente novamente em alguns minutos.';
      default:
        return `Erro ${response.status}: ${response.statusText}`;
    }
  }

  /**
   * Extrai mensagem de erro
   * @private
   */
  private getErrorMessage(error: any): string {
    if (!isPlatformBrowser(this.platformId)) {
      return 'Operação não disponível no servidor';
    }

    if (error instanceof TypeError) {
      if (error.message.includes('fetch')) {
        return 'Erro de conexão. Verifique sua internet.';
      }
      return error.message;
    }

    return error?.message || 'Erro desconhecido';
  }

  /**
   * Obtém o token de acesso do usuário autenticado
   * @private
   */
  private getAccessToken(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return '';
    }

    // O backend usa cookies HTTP-only, então não temos acesso direto ao token via JS
    // Mas alguns backends também aceitam token no localStorage como fallback
    // Se o backend usa cookies HTTP-only, este será uma string vazia
    // e o navegador enviará os cookies automaticamente com credentials: 'include'
    try {
      // Tentar obter do localStorage como fallback
      const token = localStorage.getItem('accessToken');
      if (token) {
        console.log('🔐 [TOKEN] Encontrado accessToken no localStorage (', token.substring(0, 20) + '...' + ')');
        return token;
      }
      
      // Se não houver em localStorage, retornar vazio
      // O navegador enviará cookies automaticamente com withCredentials
      console.log('🔐 [TOKEN] Nenhum accessToken no localStorage - usando cookies HTTP-only');
      return '';
    } catch (error) {
      console.error('🔐 [TOKEN] Erro ao recuperar token:', error);
      return '';
    }
  }

  /**
   * Define o estado de inscrição
   */
  setSubscribedState(isSubscribed: boolean): void {
    this.isSubscribedSubject.next(isSubscribed);
  }

  /**
   * Obtém o estado atual de inscrição
   */
  getSubscribedState(): boolean {
    return this.isSubscribedSubject.value;
  }

  /**
   * Obtém o estado de carregamento atual
   */
  isRegistrationLoading(): boolean {
    return this.registrationLoadingSubject.value;
  }

  /**
   * Limpa as mensagens de erro
   */
  clearRegistrationError(): void {
    this.registrationErrorSubject.next(null);
  }
}
